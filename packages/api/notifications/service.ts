import "server-only";
import { loadEmailConfig } from "./config";
import { getProvider } from "./providers";
import { DrizzleNotificationStore } from "./store";
import { renderTemplate } from "./templates";

import type { EmailConfig } from "./config";
import type { NotificationRow, NotificationStore } from "./store";
import type { EmailProvider, SendNotificationInput } from "./types";

export const MAX_SEND_ATTEMPTS = 3;
/** Short exponential backoff between retries (after attempt 1, then 2). */
export const RETRY_BACKOFF_MS = [100, 400];

export interface ServiceDeps {
	store?: NotificationStore;
	provider?: EmailProvider;
	config?: Pick<EmailConfig, "provider" | "from" | "dailyLimit">;
	now?: () => Date;
	sleep?: (ms: number) => Promise<void>;
}

interface ResolvedDeps {
	store: NotificationStore;
	provider?: EmailProvider;
	config?: Pick<EmailConfig, "provider" | "from" | "dailyLimit">;
	now: () => Date;
	sleep: (ms: number) => Promise<void>;
}

export interface SendNotificationResult {
	/** Null only when even the row could not be created or found. Never throws. */
	notification: NotificationRow | null;
}

function resolveDeps(deps?: ServiceDeps): ResolvedDeps {
	return {
		store: deps?.store ?? new DrizzleNotificationStore(),
		provider: deps?.provider,
		config: deps?.config,
		now: deps?.now ?? (() => new Date()),
		sleep:
			deps?.sleep ??
			((ms: number) =>
				new Promise<void>((resolve) => setTimeout(resolve, ms))),
	};
}

async function resolveProvider(deps: ResolvedDeps): Promise<EmailProvider> {
	if (deps.provider) return deps.provider;
	const config = deps.config ?? loadEmailConfig();
	const provider = await getProvider(config.provider);
	deps.provider = provider;
	return provider;
}

function resolveConfig(
	deps: ResolvedDeps,
): Pick<EmailConfig, "provider" | "from" | "dailyLimit"> {
	return deps.config ?? loadEmailConfig();
}

/**
 * Central entry point. Inserts the notification idempotently and sends it.
 * Replays of the same idempotencyKey return the existing row without
 * sending again — including concurrent calls, which serialize on the UNIQUE
 * constraint plus the atomic claim. Never throws: every failure is recorded
 * on the row instead.
 */
export async function sendNotification(
	input: SendNotificationInput,
	deps?: ServiceDeps,
): Promise<SendNotificationResult> {
	const resolved = resolveDeps(deps);
	const store = resolved.store;
	let rowId: string | null = null;
	try {
		const config = resolveConfig(resolved);
		const { row, inserted } = await store.insertIgnore({
			type: input.type,
			idempotencyKey: input.idempotencyKey,
			to: input.to,
			eventId: input.eventId ?? null,
			payload: input.payload,
		});
		rowId = row.id;
		if (!inserted) return { notification: row };

		if (config.dailyLimit !== undefined) {
			const used = await store.countActiveLast24h();
			if (used >= config.dailyLimit) {
				const blocked = await store.update(row.id, {
					status: "blocked_quota",
					lastError: `daily_limit_reached: ${used}/${config.dailyLimit} sends in the last 24h`,
					lastErrorRetryable: false,
				});
				return { notification: blocked ?? row };
			}
		}

		return await processNotification(row.id, resolved);
	} catch (err) {
		console.error(
			"[notifications] sendNotification failed:",
			messageOf(err),
		);
		if (rowId) {
			try {
				return { notification: await store.getById(rowId) };
			} catch {
				return { notification: null };
			}
		}
		return { notification: null };
	}
}

/**
 * Claims a notification and runs render + send + record. Used by
 * `sendNotification` and exposed so an admin can reprocess a
 * failed/blocked row later (the admin path intentionally bypasses the daily
 * cap — it is an explicit human retry). Claiming is atomic, so two processes
 * can never send the same notification. Never throws.
 */
export async function processNotification(
	id: string,
	deps?: ServiceDeps,
): Promise<SendNotificationResult> {
	const resolved = resolveDeps(deps);
	const store = resolved.store;
	try {
		const claimed = await store.claim(id);
		if (!claimed) {
			return { notification: await store.getById(id) };
		}

		const config = resolveConfig(resolved);
		const provider = await resolveProvider(resolved);

		let rendered;
		try {
			rendered = await renderTemplate(claimed.type, claimed.payload);
		} catch (err) {
			const failed = await store.update(id, {
				status: "failed",
				lastError: `render_error: ${messageOf(err)}`,
				lastErrorRetryable: false,
			});
			return { notification: failed ?? claimed };
		}
		await store.update(id, {
			subject: rendered.subject,
			templateVersion: rendered.templateVersion,
		});

		for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
			let result;
			try {
				result = await provider.send({
					to: claimed.recipientEmail,
					from: config.from,
					subject: rendered.subject,
					html: rendered.html,
					text: rendered.text,
					headers: {
						"X-Verific-Notification-Id": claimed.id,
						"X-Verific-Notification-Type": claimed.type,
					},
					idempotencyKey: claimed.idempotencyKey,
				});
			} catch (err) {
				// Defensive: providers must never throw, but a custom one might.
				result = {
					ok: false as const,
					retryable: true,
					code: "provider_exception",
					message: messageOf(err),
				};
			}

			if (result.ok) {
				const sent = await store.update(id, {
					status: "sent",
					attempts: attempt,
					lastError: null,
					lastErrorRetryable: null,
					provider: provider.name,
					providerMessageId: result.providerMessageId,
					sentAt: resolved.now(),
				});
				return { notification: sent ?? claimed };
			}

			if (result.code === "provider_quota") {
				const blocked = await store.update(id, {
					status: "blocked_quota",
					attempts: attempt,
					lastError: `${result.code}: ${result.message}`,
					lastErrorRetryable: false,
					provider: provider.name,
				});
				return { notification: blocked ?? claimed };
			}

			await store.update(id, {
				attempts: attempt,
				lastError: `${result.code}: ${result.message}`,
				lastErrorRetryable: result.retryable,
				provider: provider.name,
			});
			if (!result.retryable || attempt >= MAX_SEND_ATTEMPTS) {
				const failed = await store.update(id, { status: "failed" });
				return { notification: failed ?? claimed };
			}
			await resolved.sleep(RETRY_BACKOFF_MS[attempt - 1] ?? 500);
		}
		return { notification: await store.getById(id) };
	} catch (err) {
		console.error(
			"[notifications] processNotification failed:",
			messageOf(err),
		);
		try {
			return {
				notification: await store.update(id, {
					status: "failed",
					lastError:
						"unexpected_error: notification processing failed",
					lastErrorRetryable: false,
				}),
			};
		} catch {
			return { notification: null };
		}
	}
}

function messageOf(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}
