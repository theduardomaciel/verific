import { randomUUID } from "node:crypto";

import { STALE_CLAIM_TIMEOUT_MS } from "./store";

import type {
	InsertNotificationInput,
	ListNotificationsOptions,
	NotificationRow,
	NotificationStore,
} from "./store";
import type {
	NotificationCursor,
	NotificationListFilter,
	NotificationStatusCounts,
	PublicNotification,
} from "./types";

const CLAIMABLE = ["pending", "failed", "blocked_quota", "skipped"];
const ATTENTION = ["pending", "failed", "blocked_quota"];

/**
 * Test-only fake mirroring DrizzleNotificationStore's semantics (atomic
 * insert/claim, stuck derivation, keyset paging) without a database.
 */
export class InMemoryNotificationStore implements NotificationStore {
	rows = new Map<string, NotificationRow>();
	byKey = new Map<string, string>();

	async insertIgnore(
		input: InsertNotificationInput,
	): Promise<{ row: NotificationRow; inserted: boolean }> {
		// No await between check and set: atomic in single-threaded JS, like
		// ON CONFLICT DO NOTHING under a UNIQUE constraint.
		const existingId = this.byKey.get(input.idempotencyKey);
		if (existingId) {
			return { row: this.rows.get(existingId)!, inserted: false };
		}
		const now = new Date();
		const row: NotificationRow = {
			id: randomUUID(),
			type: input.type,
			idempotencyKey: input.idempotencyKey,
			eventId: input.eventId ?? null,
			recipientEmail: input.to,
			subject: null,
			templateVersion: null,
			status: input.status ?? "pending",
			attempts: 0,
			lastError: null,
			lastErrorRetryable: null,
			provider: null,
			providerMessageId: null,
			entityRefs: input.entityRefs,
			propsHash: null,
			skipReason: input.skipReason ?? null,
			createdAt: now,
			updatedAt: now,
			sentAt: null,
		};
		this.rows.set(row.id, row);
		this.byKey.set(input.idempotencyKey, row.id);
		return { row, inserted: true };
	}

	async insertIgnoreMany(
		inputs: InsertNotificationInput[],
	): Promise<Array<{ row: NotificationRow; inserted: boolean }>> {
		const results: Array<{ row: NotificationRow; inserted: boolean }> = [];
		for (const input of inputs) {
			results.push(await this.insertIgnore(input));
		}
		return results;
	}

	async claim(id: string): Promise<NotificationRow | null> {
		const row = this.rows.get(id);
		if (!row) return null;
		if (!CLAIMABLE.includes(row.status) && !isStuck(row)) return null;
		const claimed = {
			...row,
			status: "sending" as const,
			updatedAt: new Date(),
		};
		this.rows.set(id, claimed);
		return claimed;
	}

	async countUsageLast24h(): Promise<number> {
		const now = Date.now();
		let total = 0;
		for (const row of this.rows.values()) {
			if (
				(row.status === "sent" &&
					row.sentAt !== null &&
					row.sentAt.getTime() >= now - 24 * 60 * 60 * 1000) ||
				(row.status === "sending" && !isStuck(row, now))
			) {
				total += 1;
			}
		}
		return total;
	}

	async listPage(options: ListNotificationsOptions): Promise<{
		items: PublicNotification[];
		nextCursor: NotificationCursor | null;
	}> {
		const now = Date.now();
		const email = options.email?.trim().toLowerCase() ?? "";
		const ranked = [...this.rows.values()]
			.filter((row) => row.eventId === options.eventId)
			.filter(
				(row) =>
					!email || row.recipientEmail.toLowerCase().includes(email),
			)
			.filter((row) => matchesFilter(row, options.filter, now))
			.filter((row) => {
				if (!options.cursor) return true;
				const cursorTime = new Date(options.cursor.createdAt).getTime();
				const rowTime = row.createdAt.getTime();
				return (
					rowTime < cursorTime ||
					(rowTime === cursorTime && row.id < options.cursor.id)
				);
			})
			.sort((a, b) => {
				const byTime = b.createdAt.getTime() - a.createdAt.getTime();
				if (byTime !== 0) return byTime;
				return b.id < a.id ? -1 : b.id > a.id ? 1 : 0;
			});
		const items = ranked
			.slice(0, options.limit)
			.map((row) => toPublic(row, now));
		const last = items[items.length - 1];
		return {
			items,
			nextCursor:
				ranked.length > options.limit && last
					? { createdAt: last.createdAt.toISOString(), id: last.id }
					: null,
		};
	}

	async statusCounts(eventId: string): Promise<NotificationStatusCounts> {
		const now = Date.now();
		const counts: NotificationStatusCounts = {
			pending: 0,
			sending: 0,
			stuck: 0,
			sent: 0,
			failed: 0,
			blocked_quota: 0,
			skipped: 0,
		};
		for (const row of this.rows.values()) {
			if (row.eventId !== eventId) continue;
			if (row.status === "sending") {
				if (isStuck(row, now)) counts.stuck += 1;
				else counts.sending += 1;
			} else {
				counts[row.status] += 1;
			}
		}
		return counts;
	}

	async update(
		id: string,
		patch: Partial<NotificationRow>,
	): Promise<NotificationRow | null> {
		const row = this.rows.get(id);
		if (!row) return null;
		const next = { ...row, ...patch, updatedAt: new Date() };
		this.rows.set(id, next);
		return next;
	}

	async getById(id: string): Promise<NotificationRow | null> {
		return this.rows.get(id) ?? null;
	}

	async recoverStuckClaims(): Promise<number> {
		const now = Date.now();
		let count = 0;
		for (const [id, row] of this.rows.entries()) {
			if (row.status === "sending" && isStuck(row, now)) {
				const updated = {
					...row,
					status: "pending" as const,
					updatedAt: new Date(),
				};
				this.rows.set(id, updated);
				count += 1;
			}
		}
		return count;
	}
}

function isStuck(row: NotificationRow, now: number = Date.now()): boolean {
	return (
		row.status === "sending" &&
		now - row.updatedAt.getTime() > STALE_CLAIM_TIMEOUT_MS
	);
}

function matchesFilter(
	row: NotificationRow,
	filter: NotificationListFilter,
	now: number,
	email?: string | null,
): boolean {
	switch (filter) {
		case "all":
			return true;
		case "attention":
			return ATTENTION.includes(row.status) || isStuck(row, now);
		case "stuck":
			return isStuck(row, now);
		case "sending":
			return row.status === "sending" && !isStuck(row, now);
		default:
			return row.status === filter;
	}
}

function toPublic(row: NotificationRow, now: number): PublicNotification {
	return { ...row, stuck: isStuck(row, now) };
}
