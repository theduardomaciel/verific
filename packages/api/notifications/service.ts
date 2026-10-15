import "server-only";
import { loadEmailConfig } from "./config";
import { getProvider } from "./providers";
import { DrizzleNotificationStore, STALE_CLAIM_TIMEOUT_MS } from "./store";
import { renderTemplate } from "./templates";

import type { EmailConfig } from "./config";
import type {
	ListNotificationsOptions,
	NotificationRow,
	NotificationStore,
} from "./store";
import type {
	EmailProvider,
	NotificationCursor,
	NotificationListFilter,
	PublicNotification,
	SendNotificationInput,
} from "./types";

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

export interface EmailUsage {
	/**
	 * Same counting as the daily cap: rows `sent` by sentAt within the last
	 * 24h, plus non-stale `sending` rows.
	 */
	sentLast24h: number;
	/** Configured EMAIL_DAILY_LIMIT, or null when uncapped. */
	limit: number | null;
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
 * Current email usage for admin surfaces: same 24h counting the daily cap
 * uses, plus the configured limit (null when uncapped).
 */
export async function getEmailUsage(deps?: ServiceDeps): Promise<EmailUsage> {
	const resolved = resolveDeps(deps);
	const [sentLast24h, config] = await Promise.all([
		resolved.store.countUsageLast24h(),
		Promise.resolve(resolveConfig(resolved)),
	]);
	return { sentLast24h, limit: config.dailyLimit ?? null };
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
			const used = await store.countUsageLast24h();
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

export interface ReprocessOneOptions {
	eventId: string;
	id: string;
}

export interface ReprocessBatchOptions {
	eventId: string;
	filter: NotificationListFilter;
	cursor?: { createdAt: Date | string; id: string } | null;
	limit: number;
}

export interface ReprocessBatchResult {
	processed: number;
	succeeded: number;
	failed: number;
	skipped: number;
	nextCursor: NotificationCursor | null;
	capReached: boolean;
}

/** Row without `payload`, for admin responses. */
export function toPublicNotification(row: NotificationRow): PublicNotification {
	const { payload: _payload, ...rest } = row;
	return {
		...rest,
		stuck:
			row.status === "sending" &&
			Date.now() - row.updatedAt.getTime() > STALE_CLAIM_TIMEOUT_MS,
	};
}

/**
 * Admin reprocess of a single notification within an event. Goes through
 * processNotification, so the atomic claim keeps every guarantee (a `sent`
 * or freshly `sending` row is returned untouched, never resent). Returns
 * null when the row does not exist or belongs to another event.
 */
export async function reprocessOneNotification(
	options: ReprocessOneOptions,
	deps?: ServiceDeps,
): Promise<{ notification: PublicNotification | null }> {
	const resolved = resolveDeps(deps);
	const existing = await resolved.store.getById(options.id);
	if (!existing || existing.eventId !== options.eventId) {
		return { notification: null };
	}
	const { notification } = await processNotification(options.id, resolved);
	if (!notification) return { notification: null };
	return { notification: toPublicNotification(notification) };
}

/**
 * Admin batch reprocess, bounded per call. Enforces the daily cap itself
 * (unlike processNotification): processes at most `limit - sentLast24h`
 * rows and reports `capReached` so the client stops looping. Paging uses a
 * keyset cursor on (createdAt, id), so a row that fails again keeps its
 * position behind the cursor and is never attempted twice in one run.
 */
export async function reprocessBatchNotifications(
	options: ReprocessBatchOptions,
	deps?: ServiceDeps,
): Promise<ReprocessBatchResult> {
	const resolved = resolveDeps(deps);
	const store = resolved.store;
	const empty: ReprocessBatchResult = {
		processed: 0,
		succeeded: 0,
		failed: 0,
		skipped: 0,
		nextCursor: null,
		capReached: false,
	};
	const usage = await getEmailUsage(resolved);
	let allowed = options.limit;
	if (usage.limit !== null) {
		allowed = Math.min(
			options.limit,
			Math.max(0, usage.limit - usage.sentLast24h),
		);
		if (allowed <= 0) return { ...empty, capReached: true };
	}
	const page = await store.listPage({
		eventId: options.eventId,
		filter: options.filter,
		cursor: options.cursor,
		limit: allowed + 1,
	} satisfies ListNotificationsOptions);
	const batch = page.items.slice(0, allowed);
	const result: ReprocessBatchResult = { ...empty };
	for (const item of batch) {
		if (item.status === "sent") {
			result.skipped += 1;
			result.processed += 1;
			continue;
		}
		const { notification } = await processNotification(item.id, resolved);
		result.processed += 1;
		if (!notification) {
			result.failed += 1;
		} else if (notification.status === "sent") {
			result.succeeded += 1;
		} else if (
			notification.status === "sending" &&
			item.status === "sending"
		) {
			// Claim refused a fresh `sending` row: untouched, not a failure.
			result.skipped += 1;
		} else {
			result.failed += 1;
		}
	}
	const last = batch[batch.length - 1];
	result.nextCursor =
		page.items.length > allowed && last
			? { createdAt: last.createdAt.toISOString(), id: last.id }
			: null;
	if (usage.limit !== null) {
		const after = await store.countUsageLast24h();
		result.capReached = after >= usage.limit;
	}
	return result;
}
