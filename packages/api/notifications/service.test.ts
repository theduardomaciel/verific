import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@verific/drizzle", () => ({ db: {} }));
vi.mock("@verific/env", () => ({ env: {} }));

import { processNotification, sendNotification } from "./service";

import type {
	InsertNotificationInput,
	NotificationRow,
	NotificationStore,
} from "./store";
import type { EmailProvider, SendNotificationInput, SendResult } from "./types";

const CLAIMABLE = ["pending", "failed", "blocked_quota"];

/** Mirrors DrizzleNotificationStore's atomic semantics without a database. */
class InMemoryNotificationStore implements NotificationStore {
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
			status: "pending",
			attempts: 0,
			lastError: null,
			lastErrorRetryable: null,
			provider: null,
			providerMessageId: null,
			payload: input.payload,
			createdAt: now,
			updatedAt: now,
			sentAt: null,
		};
		this.rows.set(row.id, row);
		this.byKey.set(input.idempotencyKey, row.id);
		return { row, inserted: true };
	}

	async claim(id: string): Promise<NotificationRow | null> {
		const row = this.rows.get(id);
		if (!row || !CLAIMABLE.includes(row.status)) return null;
		const claimed = {
			...row,
			status: "sending" as const,
			updatedAt: new Date(),
		};
		this.rows.set(id, claimed);
		return claimed;
	}

	async countActiveLast24h(): Promise<number> {
		const since = Date.now() - 24 * 60 * 60 * 1000;
		let count = 0;
		for (const row of this.rows.values()) {
			if (
				(row.status === "sent" || row.status === "sending") &&
				row.createdAt.getTime() >= since
			) {
				count += 1;
			}
		}
		return count;
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
}

function setup(options?: {
	sendImpl?: (call: number) => SendResult | Promise<SendResult>;
	dailyLimit?: number;
	seed?: (store: InMemoryNotificationStore) => Promise<void> | void;
}) {
	const store = new InMemoryNotificationStore();
	let call = 0;
	const send = vi.fn(async () => {
		call += 1;
		return (
			options?.sendImpl?.(call) ?? {
				ok: true as const,
				providerMessageId: `msg-${call}`,
			}
		);
	});
	const provider: EmailProvider = { name: "fake", send };
	const deps = {
		store,
		provider,
		config: {
			provider: "console" as const,
			from: "Verific <nao-responder@example.com>",
			dailyLimit: options?.dailyLimit,
		},
		now: () => new Date("2026-01-01T00:00:00Z"),
		sleep: vi.fn(async () => {}),
	};
	const input: SendNotificationInput = {
		type: "event_registration_confirmation",
		idempotencyKey: `key-${randomUUID()}`,
		to: "user@example.com",
		eventId: randomUUID(),
		payload: { eventName: "UFAL Tech Day" },
	};
	return { store, send, deps, input, seed: options?.seed };
}

describe("sendNotification", () => {
	it("same idempotency key twice results in one send", async () => {
		const { send, deps, input } = setup();
		const first = await sendNotification(input, deps);
		const second = await sendNotification(input, deps);

		expect(send).toHaveBeenCalledTimes(1);
		expect(first.notification?.status).toBe("sent");
		expect(second.notification?.id).toBe(first.notification?.id);
		expect(second.notification?.status).toBe("sent");
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({ idempotencyKey: input.idempotencyKey }),
		);
	});

	it("concurrent calls with the same key send exactly once", async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const { send, deps, input } = setup({
			sendImpl: async () => {
				await gate;
				return { ok: true, providerMessageId: "msg-1" };
			},
		});

		const pending = Promise.all(
			Array.from({ length: 5 }, () => sendNotification(input, deps)),
		);
		release();
		const results = await pending;

		expect(send).toHaveBeenCalledTimes(1);
		const ids = new Set(results.map((r) => r.notification?.id));
		expect(ids.size).toBe(1);
	});

	it("retryable error then success sends twice and ends sent", async () => {
		const { send, deps, input } = setup({
			sendImpl: (call) =>
				call === 1
					? {
							ok: false,
							retryable: true,
							code: "ses_throttled",
							message: "slow down",
						}
					: { ok: true, providerMessageId: "msg-ok" },
		});

		const { notification } = await sendNotification(input, deps);

		expect(send).toHaveBeenCalledTimes(2);
		expect(deps.sleep).toHaveBeenCalledTimes(1);
		expect(notification?.status).toBe("sent");
		expect(notification?.attempts).toBe(2);
		expect(notification?.providerMessageId).toBe("msg-ok");
		expect(notification?.lastError).toBeNull();
	});

	it("permanent error stops after one attempt and ends failed", async () => {
		const { send, deps, input } = setup({
			sendImpl: () => ({
				ok: false,
				retryable: false,
				code: "validation_error",
				message: "bad address",
			}),
		});

		const { notification } = await sendNotification(input, deps);

		expect(send).toHaveBeenCalledTimes(1);
		expect(deps.sleep).not.toHaveBeenCalled();
		expect(notification?.status).toBe("failed");
		expect(notification?.attempts).toBe(1);
		expect(notification?.lastError).toContain("validation_error");
		expect(notification?.lastErrorRetryable).toBe(false);
	});

	it("provider_quota ends blocked_quota without further retries", async () => {
		const { send, deps, input } = setup({
			sendImpl: () => ({
				ok: false,
				retryable: false,
				code: "provider_quota",
				message: "daily quota exceeded",
			}),
		});

		const { notification } = await sendNotification(input, deps);

		expect(send).toHaveBeenCalledTimes(1);
		expect(deps.sleep).not.toHaveBeenCalled();
		expect(notification?.status).toBe("blocked_quota");
		expect(notification?.attempts).toBe(1);
	});

	it("an unexpected exception from a provider is recorded, not propagated", async () => {
		const { send, deps, input } = setup();
		send.mockRejectedValue(new Error("boom"));

		const { notification } = await sendNotification(input, deps);

		expect(send).toHaveBeenCalledTimes(3);
		expect(notification?.status).toBe("failed");
		expect(notification?.attempts).toBe(3);
		expect(notification?.lastError).toContain("provider_exception");
		expect(notification?.lastError).toContain("boom");
	});

	it("daily cap reached results in blocked_quota and no send", async () => {
		const { store, send, deps, input } = setup({ dailyLimit: 1 });
		const seeded = await store.insertIgnore({
			type: "event_registration_confirmation",
			idempotencyKey: `seed-${randomUUID()}`,
			to: "other@example.com",
			eventId: null,
			payload: {},
		});
		await store.update(seeded.row.id, { status: "sent" });

		const { notification } = await sendNotification(input, deps);

		expect(send).not.toHaveBeenCalled();
		expect(notification?.status).toBe("blocked_quota");
		expect(notification?.attempts).toBe(0);
		expect(notification?.lastError).toContain("daily_limit_reached");
	});

	it("reprocessing a finished notification does not send again", async () => {
		const { send, deps, input } = setup();
		const first = await sendNotification(input, deps);
		const id = first.notification!.id;

		const again = await processNotification(id, deps);

		expect(send).toHaveBeenCalledTimes(1);
		expect(again.notification?.status).toBe("sent");
	});
});
