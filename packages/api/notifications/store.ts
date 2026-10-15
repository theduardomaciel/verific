import { db } from "@verific/drizzle";
import {
	and,
	count,
	desc,
	eq,
	gte,
	inArray,
	lt,
	or,
	sql,
} from "@verific/drizzle/orm";
import type { SQL } from "@verific/drizzle/orm";
import type { notification } from "@verific/drizzle/schema";
import { notification as notificationTable } from "@verific/drizzle/schema";

import type {
	NotificationCursor,
	NotificationListFilter,
	NotificationStatusCounts,
	PublicNotification,
} from "./types";

export type NotificationRow = typeof notification.$inferSelect;

export type NotificationStatus = NotificationRow["status"];

export interface InsertNotificationInput {
	type: string;
	idempotencyKey: string;
	to: string;
	eventId?: string | null;
	payload: Record<string, unknown>;
}

export type NotificationPatch = Partial<
	Pick<
		NotificationRow,
		| "subject"
		| "templateVersion"
		| "status"
		| "attempts"
		| "lastError"
		| "lastErrorRetryable"
		| "provider"
		| "providerMessageId"
		| "sentAt"
	>
>;

/**
 * Persistence boundary for the notification service. The Drizzle
 * implementation below is the production one; tests inject an in-memory
 * fake implementing the same atomic semantics.
 */
export interface NotificationStore {
	/**
	 * Inserts the row, doing nothing on idempotencyKey conflict. Returns the
	 * row plus whether this call created it (`inserted: false` means a replay
	 * and must not be sent again).
	 */
	insertIgnore(
		input: InsertNotificationInput,
	): Promise<{ row: NotificationRow; inserted: boolean }>;
	/**
	 * Atomically transitions the row to `sending` from
	 * `pending`/`failed`/`blocked_quota`, or from a stale `sending` (claimed
	 * over STALE_CLAIM_TIMEOUT_MS ago — the worker died mid-send). Returns the
	 * claimed row, or null when another process owns or finished it.
	 */
	claim(id: string): Promise<NotificationRow | null>;
	/**
	 * Shared usage counting for the daily cap and getEmailUsage: rows `sent`
	 * by sentAt within the last 24h, plus `sending` rows that are not stale
	 * (a reprocessed row created earlier but sent now counts via sentAt).
	 */
	countUsageLast24h(): Promise<number>;
	/**
	 * Event-scoped admin listing, newest first, keyset-paginated on
	 * (createdAt, id). Never selects `payload`. `stuck` is derived in SQL.
	 */
	listPage(options: ListNotificationsOptions): Promise<{
		items: PublicNotification[];
		nextCursor: NotificationCursor | null;
	}>;
	/** Event-scoped counts by status, with stale `sending` split out as `stuck`. */
	statusCounts(eventId: string): Promise<NotificationStatusCounts>;
	update(
		id: string,
		patch: NotificationPatch,
	): Promise<NotificationRow | null>;
	getById(id: string): Promise<NotificationRow | null>;
}

export interface ListNotificationsOptions {
	eventId: string;
	filter: NotificationListFilter;
	cursor?: { createdAt: Date | string; id: string } | null;
	limit: number;
}

const CLAIMABLE_STATUSES: NotificationStatus[] = [
	"pending",
	"failed",
	"blocked_quota",
];

/**
 * A row stuck in `sending` longer than this is assumed orphaned (the worker
 * died after claiming) and becomes claimable again. The claim still bumps
 * `updatedAt`, so concurrent recoverers serialize: only one wins.
 */
export const STALE_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

export class DrizzleNotificationStore implements NotificationStore {
	async insertIgnore(
		input: InsertNotificationInput,
	): Promise<{ row: NotificationRow; inserted: boolean }> {
		const inserted = await db
			.insert(notificationTable)
			.values({
				type: input.type,
				idempotencyKey: input.idempotencyKey,
				eventId: input.eventId ?? null,
				recipientEmail: input.to,
				payload: input.payload,
			})
			.onConflictDoNothing({ target: notificationTable.idempotencyKey })
			.returning();
		const created = inserted[0];
		if (created) return { row: created, inserted: true };
		const existing = await db
			.select()
			.from(notificationTable)
			.where(eq(notificationTable.idempotencyKey, input.idempotencyKey));
		const row = existing[0];
		if (!row)
			throw new Error(
				"Notification row vanished after idempotent insert.",
			);
		return { row, inserted: false };
	}

	async claim(id: string): Promise<NotificationRow | null> {
		const staleBefore = new Date(Date.now() - STALE_CLAIM_TIMEOUT_MS);
		const claimed = await db
			.update(notificationTable)
			.set({ status: "sending", updatedAt: new Date() })
			.where(
				and(
					eq(notificationTable.id, id),
					or(
						inArray(notificationTable.status, CLAIMABLE_STATUSES),
						and(
							eq(notificationTable.status, "sending"),
							lt(notificationTable.updatedAt, staleBefore),
						),
					),
				),
			)
			.returning();
		return claimed[0] ?? null;
	}

	async countUsageLast24h(): Promise<number> {
		const now = Date.now();
		const result = await db
			.select({ value: count() })
			.from(notificationTable)
			.where(
				or(
					and(
						eq(notificationTable.status, "sent"),
						gte(
							notificationTable.sentAt,
							new Date(now - 24 * 60 * 60 * 1000),
						),
					),
					and(
						eq(notificationTable.status, "sending"),
						gte(
							notificationTable.updatedAt,
							new Date(now - STALE_CLAIM_TIMEOUT_MS),
						),
					),
				),
			);
		return result[0]?.value ?? 0;
	}

	async listPage(options: ListNotificationsOptions): Promise<{
		items: PublicNotification[];
		nextCursor: NotificationCursor | null;
	}> {
		const staleBefore = new Date(Date.now() - STALE_CLAIM_TIMEOUT_MS);
		const conditions: (SQL | undefined)[] = [
			eq(notificationTable.eventId, options.eventId),
			...filterConditions(options.filter, staleBefore),
		];
		if (options.cursor) {
			const cursorDate = new Date(options.cursor.createdAt);
			conditions.push(
				or(
					lt(notificationTable.createdAt, cursorDate),
					and(
						eq(notificationTable.createdAt, cursorDate),
						lt(notificationTable.id, options.cursor.id),
					),
				),
			);
		}
		const rows = await db
			.select({
				id: notificationTable.id,
				type: notificationTable.type,
				idempotencyKey: notificationTable.idempotencyKey,
				eventId: notificationTable.eventId,
				recipientEmail: notificationTable.recipientEmail,
				subject: notificationTable.subject,
				templateVersion: notificationTable.templateVersion,
				status: notificationTable.status,
				stuck: stuckExpression(staleBefore),
				attempts: notificationTable.attempts,
				lastError: notificationTable.lastError,
				lastErrorRetryable: notificationTable.lastErrorRetryable,
				provider: notificationTable.provider,
				providerMessageId: notificationTable.providerMessageId,
				createdAt: notificationTable.createdAt,
				updatedAt: notificationTable.updatedAt,
				sentAt: notificationTable.sentAt,
			})
			.from(notificationTable)
			.where(and(...conditions))
			.orderBy(
				desc(notificationTable.createdAt),
				desc(notificationTable.id),
			)
			.limit(options.limit + 1);
		const items = rows.slice(0, options.limit);
		const last = items[items.length - 1];
		return {
			items,
			nextCursor:
				rows.length > options.limit && last
					? { createdAt: last.createdAt.toISOString(), id: last.id }
					: null,
		};
	}

	async statusCounts(eventId: string): Promise<NotificationStatusCounts> {
		const staleBefore = new Date(Date.now() - STALE_CLAIM_TIMEOUT_MS);
		const [row] = await db
			.select({
				pending: sql<number>`count(*) filter (where ${notificationTable.status} = 'pending')::int`,
				sending: sql<number>`count(*) filter (where ${notificationTable.status} = 'sending' and ${notificationTable.updatedAt} >= ${staleBefore})::int`,
				stuck: sql<number>`count(*) filter (where ${notificationTable.status} = 'sending' and ${notificationTable.updatedAt} < ${staleBefore})::int`,
				sent: sql<number>`count(*) filter (where ${notificationTable.status} = 'sent')::int`,
				failed: sql<number>`count(*) filter (where ${notificationTable.status} = 'failed')::int`,
				blocked_quota: sql<number>`count(*) filter (where ${notificationTable.status} = 'blocked_quota')::int`,
			})
			.from(notificationTable)
			.where(eq(notificationTable.eventId, eventId));
		return {
			pending: row?.pending ?? 0,
			sending: row?.sending ?? 0,
			stuck: row?.stuck ?? 0,
			sent: row?.sent ?? 0,
			failed: row?.failed ?? 0,
			blocked_quota: row?.blocked_quota ?? 0,
		};
	}

	async update(
		id: string,
		patch: NotificationPatch,
	): Promise<NotificationRow | null> {
		const updated = await db
			.update(notificationTable)
			.set({ ...patch, updatedAt: new Date() })
			.where(eq(notificationTable.id, id))
			.returning();
		return updated[0] ?? null;
	}

	async getById(id: string): Promise<NotificationRow | null> {
		const rows = await db
			.select()
			.from(notificationTable)
			.where(eq(notificationTable.id, id));
		return rows[0] ?? null;
	}
}

/**
 * SQL derivation of "stuck": `sending` with `updatedAt` older than the
 * reclaim threshold. Single source of truth, shared by counts, filters and
 * the per-row flag — the client never computes it.
 */
function stuckExpression(staleBefore: Date): SQL<boolean> {
	return sql<boolean>`(${notificationTable.status} = 'sending' and ${notificationTable.updatedAt} < ${staleBefore})`;
}

function filterConditions(
	filter: NotificationListFilter,
	staleBefore: Date,
): (SQL | undefined)[] {
	switch (filter) {
		case "all":
			return [];
		case "attention":
			return [
				or(
					inArray(notificationTable.status, CLAIMABLE_STATUSES),
					stuckExpression(staleBefore),
				),
			];
		case "stuck":
			return [stuckExpression(staleBefore)];
		case "sending":
			return [
				and(
					eq(notificationTable.status, "sending"),
					gte(notificationTable.updatedAt, staleBefore),
				),
			];
		default:
			return [eq(notificationTable.status, filter)];
	}
}
