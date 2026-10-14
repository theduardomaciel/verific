import { db } from "@verific/drizzle";
import { and, count, eq, gte, inArray } from "@verific/drizzle/orm";
import type { notification } from "@verific/drizzle/schema";
import { notification as notificationTable } from "@verific/drizzle/schema";

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
	 * Atomically transitions the row to `sending`, but only from
	 * `pending`/`failed`/`blocked_quota`. Returns the claimed row, or null
	 * when another process already owns or finished it.
	 */
	claim(id: string): Promise<NotificationRow | null>;
	/** Notifications `sent` or `sending` created in the last 24h. */
	countActiveLast24h(): Promise<number>;
	update(
		id: string,
		patch: NotificationPatch,
	): Promise<NotificationRow | null>;
	getById(id: string): Promise<NotificationRow | null>;
}

const CLAIMABLE_STATUSES: NotificationStatus[] = [
	"pending",
	"failed",
	"blocked_quota",
];
const ACTIVE_STATUSES: NotificationStatus[] = ["sent", "sending"];

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
		const claimed = await db
			.update(notificationTable)
			.set({ status: "sending", updatedAt: new Date() })
			.where(
				and(
					eq(notificationTable.id, id),
					inArray(notificationTable.status, CLAIMABLE_STATUSES),
				),
			)
			.returning();
		return claimed[0] ?? null;
	}

	async countActiveLast24h(): Promise<number> {
		const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const result = await db
			.select({ value: count() })
			.from(notificationTable)
			.where(
				and(
					inArray(notificationTable.status, ACTIVE_STATUSES),
					gte(notificationTable.createdAt, since),
				),
			);
		return result[0]?.value ?? 0;
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
