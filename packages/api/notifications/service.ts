import "server-only";
import { db } from "@verific/drizzle";
import { and, eq, sql } from "@verific/drizzle/orm";
import { project, user, activityWaitlist } from "@verific/drizzle/schema";

import { lockActivity } from "../seats";
import { settleActivity } from "../waitlist";
import { loadEmailConfig } from "./config";
import { getProvider } from "./providers";
import {
	getNotificationDefinition,
	hashProps,
	validateEntityRefs,
} from "./registry";
import { getNotificationEnabledMap, isNotificationEnabled } from "./settings";
import { DrizzleNotificationStore, STALE_CLAIM_TIMEOUT_MS } from "./store";

import type { EmailConfig } from "./config";
import type { BuildContext } from "./registry";
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
/** `email_quota_warning` fires once usage reaches this fraction of the cap. */
export const QUOTA_WARNING_THRESHOLD = 0.8;

export interface ServiceDeps {
	store?: NotificationStore;
	provider?: EmailProvider;
	config?: Pick<EmailConfig, "provider" | "from" | "dailyLimit">;
	now?: () => Date;
	sleep?: (ms: number) => Promise<void>;
	/** Optional per-batch cache (activity/project) for bulk sends. */
	shared?: BuildContext;
}

interface ResolvedDeps {
	store: NotificationStore;
	provider?: EmailProvider;
	config?: Pick<EmailConfig, "provider" | "from" | "dailyLimit">;
	now: () => Date;
	sleep: (ms: number) => Promise<void>;
	shared?: BuildContext;
}

export interface SendNotificationResult {
	/** Null only when even the row could not be created or found. Never throws. */
	notification: NotificationRow | null;
}

export interface EmailUsage {
	/**
	 * Same counting as the daily cap: rows `sent` by sentAt within the last
	 * 24h, plus non-stale `sending` rows. `skipped` never counts.
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
		shared: deps?.shared,
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

/** Maximum stored length of the unexpected-error message (no stacks). */
export const MAX_STORED_ERROR_LENGTH = 300;

/** Truncates a message so `lastError` stays short and secret-free. */
export function truncateMessage(text: string, max = MAX_STORED_ERROR_LENGTH) {
	return text.length <= max ? text : `${text.slice(0, max)}…`;
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
 * Central single-notification entry point. Validates `entityRefs` against
 * the registry declaration BEFORE inserting anything: missing or malformed
 * refs throw `InvalidEntityRefsError` (callers must log it and move on).
 * Then it checks the per-event setting first: a disabled type is still
 * recorded (status `skipped`, `skipReason: disabled_by_event`) so the admin
 * log explains why no e-mail went out. Enabled rows are inserted
 * idempotently and sent immediately. After validation, never throws: every
 * failure is recorded on the row instead.
 */
export async function sendNotification(
	input: SendNotificationInput,
	deps?: ServiceDeps,
): Promise<SendNotificationResult> {
	// Hard gate: bad refs must throw before a row exists. Kept outside the
	// try/catch below so the error reaches the trigger site, which logs it
	// with type and context.
	validateEntityRefs(input.type, input.entityRefs);

	const resolved = resolveDeps(deps);
	const store = resolved.store;
	let rowId: string | null = null;
	try {
		const config = resolveConfig(resolved);
		const disabled =
			input.eventId != null &&
			!(await isNotificationEnabled(input.eventId, input.type));
		const { row, inserted } = await store.insertIgnore({
			type: input.type,
			idempotencyKey: input.idempotencyKey,
			to: input.to,
			eventId: input.eventId ?? null,
			entityRefs: input.entityRefs,
			...(disabled
				? {
						status: "skipped" as const,
						skipReason: "disabled_by_event",
					}
				: {}),
		});
		rowId = row.id;
		if (!inserted || disabled) return { notification: row };

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
 * Enqueues many notifications at once (bulk cases). Gating is resolved in
 * one query per event; rows are inserted in a single round trip and NOT sent
 * here — call `processQueuedNotifications` with the returned ids, in the
 * order they should be sent (transactional first, informational later).
 */
export async function enqueueNotifications(
	inputs: SendNotificationInput[],
	deps?: ServiceDeps,
): Promise<Array<SendNotificationResult>> {
	const resolved = resolveDeps(deps);
	const store = resolved.store;
	if (inputs.length === 0) return [];
	try {
		const byEvent = new Map<string, Set<string>>();
		for (const input of inputs) {
			if (!input.eventId) continue;
			const types = byEvent.get(input.eventId) ?? new Set<string>();
			types.add(input.type);
			byEvent.set(input.eventId, types);
		}
		const enabledByEvent = new Map<string, Map<string, boolean>>();
		await Promise.all(
			[...byEvent.entries()].map(async ([eventId, types]) => {
				enabledByEvent.set(
					eventId,
					await getNotificationEnabledMap(eventId, [
						...types,
					] as never),
				);
			}),
		);

		const inserts: typeof inputs = [];
		for (const input of inputs) {
			try {
				validateEntityRefs(input.type, input.entityRefs);
			} catch (err) {
				// Refs malformados: loga com contexto e descarta a linha
				// (bulk nunca lança; a falha nunca quebra o pedido).
				console.error(
					`[notifications] enqueueNotifications descartou entrada (type=${input.type}, to=${input.to}, idempotencyKey=${input.idempotencyKey}):`,
					err,
				);
				continue;
			}
			const enabled =
				input.eventId == null
					? true
					: (enabledByEvent.get(input.eventId)?.get(input.type) ??
						true);
			inserts.push({
				type: input.type,
				idempotencyKey: input.idempotencyKey,
				to: input.to,
				eventId: input.eventId ?? null,
				entityRefs: input.entityRefs,
				...(enabled
					? {}
					: {
							status: "skipped" as const,
							skipReason: "disabled_by_event",
						}),
			});
		}
		const rows = await store.insertIgnoreMany(inserts);
		return rows.map(({ row }) => ({ notification: row }));
	} catch (err) {
		console.error(
			"[notifications] enqueueNotifications failed:",
			messageOf(err),
		);
		return inputs.map(() => ({ notification: null }));
	}
}

export interface ProcessQueuedResult {
	processed: number;
	sent: number;
	skipped: number;
	failed: number;
	remaining: number;
	capReached: boolean;
}

/**
 * Bounded send loop over already-enqueued rows. Respects EMAIL_DAILY_LIMIT:
 * when the cap is reached the remaining rows stay `pending` and are
 * reprocessable from the admin page.
 */
export async function processQueuedNotifications(
	ids: string[],
	deps?: ServiceDeps,
): Promise<ProcessQueuedResult> {
	const resolved = resolveDeps(deps);
	const config = resolveConfig(resolved);
	const result: ProcessQueuedResult = {
		processed: 0,
		sent: 0,
		skipped: 0,
		failed: 0,
		remaining: 0,
		capReached: false,
	};
	for (let index = 0; index < ids.length; index += 1) {
		if (config.dailyLimit !== undefined) {
			const used = await resolved.store.countUsageLast24h();
			if (used >= config.dailyLimit) {
				result.remaining = ids.length - index;
				result.capReached = true;
				break;
			}
		}
		const { notification } = await processNotification(
			ids[index]!,
			resolved,
		);
		result.processed += 1;
		if (!notification) result.failed += 1;
		else if (notification.status === "sent") result.sent += 1;
		else if (notification.status === "skipped") result.skipped += 1;
		else if (
			notification.status === "sending" ||
			notification.status === "pending"
		)
			result.skipped += 1;
		else result.failed += 1;
	}
	return result;
}

/**
 * Claims a notification, rebuilds props from `entityRefs`, renders and
 * sends. The same path serves the first send and admin reprocessing — there
 * is no logic that depends on the previous error. Rows already `sent` are
 * never rebuilt. Never throws.
 */
export async function processNotification(
	id: string,
	deps?: ServiceDeps,
): Promise<SendNotificationResult> {
	const resolved = resolveDeps(deps);
	const store = resolved.store;
	let claimed: NotificationRow | null = null;
	try {
		claimed = await store.claim(id);
		if (!claimed) {
			return { notification: await store.getById(id) };
		}

		const definition = getNotificationDefinition(claimed.type);
		if (!definition) {
			const skipped = await store.update(id, {
				status: "skipped",
				skipReason: "unsupported_type",
				lastError: `unsupported_type: sem template registrado para "${claimed.type}"`,
				lastErrorRetryable: false,
			});
			return { notification: skipped ?? claimed };
		}

		if (claimed.eventId) {
			const enabled = await isNotificationEnabled(
				claimed.eventId,
				claimed.type,
			);
			if (!enabled) {
				const skipped = await store.update(id, {
					status: "skipped",
					skipReason: "disabled_by_event",
					lastError: null,
					lastErrorRetryable: null,
				});
				return { notification: skipped ?? claimed };
			}
		}

		const validation = await definition.validate(claimed.entityRefs);
		if (!validation.ok) {
			const skipped = await store.update(id, {
				status: "skipped",
				skipReason: validation.reason,
				lastError: `skip: ${validation.reason}`,
				lastErrorRetryable: false,
			});
			return { notification: skipped ?? claimed };
		}

		const config = resolveConfig(resolved);
		const provider = await resolveProvider(resolved);

		let props: Record<string, unknown>;
		let rendered;
		try {
			props = await definition.buildProps(
				claimed.entityRefs,
				resolved.shared,
			);
			rendered = await definition.render(props);
		} catch (err) {
			const failed = await store.update(id, {
				status: "failed",
				lastError: `render_error: ${messageOf(err)}`,
				lastErrorRetryable: false,
			});
			return { notification: failed ?? claimed };
		}
		const subject = definition.subject(props) || rendered.subject;
		await store.update(id, {
			subject,
			templateVersion: rendered.templateVersion,
			propsHash: hashProps(props),
			skipReason: null,
		});

		for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
			let result;
			try {
				result = await provider.send({
					to: claimed.recipientEmail,
					from: config.from,
					subject,
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
				await maybeSendQuotaWarning(claimed, resolved);
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
		// Log completo (com stack) para o servidor; a row guarda só nome e
		// mensagem truncada, sem stack nem segredos.
		console.error(
			`[notifications] processNotification failed (id=${id}, type=${claimed?.type ?? "unknown"}, refs=${JSON.stringify(claimed?.entityRefs ?? null)}):`,
			err,
		);
		try {
			return {
				notification: await store.update(id, {
					status: "failed",
					lastError: `unexpected_error: ${
						err instanceof Error ? err.name : "UnknownError"
					}: ${truncateMessage(messageOf(err))}`,
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

const saoPauloDayKey = new Intl.DateTimeFormat("en-CA", {
	timeZone: "America/Sao_Paulo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

/** Owner e-mail for the event that crossed the quota threshold. */
async function loadOwnerEmail(projectId: string): Promise<string | null> {
	const rows = await db
		.select({ email: user.email })
		.from(project)
		.innerJoin(user, eq(user.id, project.ownerId))
		.where(eq(project.id, projectId));
	return rows[0]?.email?.trim() || null;
}

/**
 * Fires `email_quota_warning` once per São Paulo day when usage reaches 80%
 * of `EMAIL_DAILY_LIMIT`, after a successful send. The once-a-day guarantee
 * comes from the deterministic idempotency key
 * `email_quota_warning:{YYYY-MM-DD}`: replays find the existing row and are
 * never sent again (including when the type is disabled for the event — the
 * `skipped` row still blocks the next attempt that day). Never throws.
 */
export async function maybeSendQuotaWarning(
	row: NotificationRow,
	deps?: ServiceDeps,
): Promise<void> {
	if (!row.eventId || row.type === "email_quota_warning") return;
	const resolved = resolveDeps(deps);
	try {
		const config = resolveConfig(resolved);
		const limit = config.dailyLimit;
		if (limit === undefined || limit <= 0) return;
		const used = await resolved.store.countUsageLast24h();
		if (used < Math.ceil(limit * QUOTA_WARNING_THRESHOLD)) return;
		const ownerEmail = await loadOwnerEmail(row.eventId);
		if (!ownerEmail) return;
		const definition = getNotificationDefinition("email_quota_warning");
		if (!definition) return;
		const entityRefs = {
			projectId: row.eventId,
			used,
			limit,
			day: saoPauloDayKey.format(resolved.now()),
		};
		await sendNotification(
			{
				type: "email_quota_warning",
				idempotencyKey: definition.buildIdempotencyKey(entityRefs),
				to: ownerEmail,
				eventId: row.eventId,
				entityRefs,
			},
			resolved,
		);
	} catch (err) {
		console.error("[notifications] quota warning failed:", messageOf(err));
	}
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

/** Row without `entityRefs`, for admin responses. */
export function toPublicNotification(row: NotificationRow): PublicNotification {
	const { entityRefs: _entityRefs, ...rest } = row;
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
 * or freshly `sending` row is returned untouched, never resent) and the
 * props are rebuilt from the stored entityRefs. Returns null when the row
 * does not exist or belongs to another event.
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
		} else if (notification.status === "skipped") {
			result.skipped += 1;
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

/**
 * Sweep result for cron/manual runs.
 */
export interface SweepResult {
	recovered: number; // stuck claims recovered
	settled: number; // activities settled (offers expired, next person offered)
	durationMs: number;
	timedOut: boolean;
	lastSweepAt: string; // ISO string
}

/**
 * Runs the daily maintenance sweep:
 * 1. Recovers stuck claims (existing 10-minute logic).
 * 2. Finds offers still `offered` whose `offerExpiresAt` passed more than a small grace period ago
 *    and settles those activities so the next person in line gets offered.
 *
 * Idempotent and overlap-safe (existing atomic claim and idempotency keys).
 * A missed run is fully recovered by the next one or by the manual button.
 *
 * Note: Notification reprocessing is handled by the existing admin "Reprocessar todos"
 * button and the per-event `reprocessBatchNotifications` procedure. The sweep focuses
 * on the time-sensitive waitlist offer expiry that cannot wait for manual intervention.
 */
export async function runSweep(
	options: {
		timeBudgetMs?: number;
	} = {},
): Promise<SweepResult> {
	const startedAt = Date.now();
	const timeBudgetMs = options.timeBudgetMs ?? 25_000; // leave margin for Vercel 30s limit

	const resolved = resolveDeps();
	const store = resolved.store;

	let recovered = 0;
	let settled = 0;
	let timedOut = false;

	// 1. Recover stuck claims (10-minute timeout)
	try {
		recovered = await store.recoverStuckClaims();
	} catch (err) {
		console.error("[sweep] recoverStuckClaims failed:", messageOf(err));
	}

	// Check time budget
	if (Date.now() - startedAt > timeBudgetMs) {
		timedOut = true;
	}

	// 2. Settle activities with overdue offers (expired > 2 min ago)
	if (!timedOut) {
		try {
			const graceMs = 2 * 60 * 1000; // 2 minutes grace
			const now = new Date();
			const cutoff = new Date(now.getTime() - graceMs);

			// Find activities that have offered entries with expired offerExpiresAt
			const overdueActivities = await db
				.selectDistinct({ activityId: activityWaitlist.activityId })
				.from(activityWaitlist)
				.where(
					and(
						eq(activityWaitlist.status, "offered"),
						sql`${activityWaitlist.offerExpiresAt} < ${cutoff.toISOString()}`,
					),
				);

			for (const { activityId } of overdueActivities) {
				if (Date.now() - startedAt > timeBudgetMs) {
					timedOut = true;
					break;
				}
				try {
					await db.transaction(async (tx) => {
						const locked = await lockActivity(tx, activityId);
						await settleActivity(tx, locked, now);
					});
					settled += 1;
				} catch (err) {
					console.error(
						`[sweep] settleActivity failed for ${activityId}:`,
						messageOf(err),
					);
				}
			}
		} catch (err) {
			console.error(
				"[sweep] overdue offers query failed:",
				messageOf(err),
			);
		}
	}

	const lastSweepAt = new Date().toISOString();
	const durationMs = Date.now() - startedAt;

	// TODO: Persist lastSweepAt to a settings/state table for admin UI display
	// For now, return it so the caller can store it if needed.

	return {
		recovered,
		settled,
		durationMs,
		timedOut,
		lastSweepAt,
	};
}
