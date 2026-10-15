import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@verific/drizzle", () => ({ db: {} }));
vi.mock("@verific/env", () => ({ env: {} }));

import {
	getEmailUsage,
	processNotification,
	sendNotification,
} from "./service";
import { STALE_CLAIM_TIMEOUT_MS } from "./store";
import { InMemoryNotificationStore } from "./store.memory";

import type { EmailProvider, SendNotificationInput, SendResult } from "./types";

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
		payload: {
			participantName: "Maria Silva",
			eventName: "UFAL Tech Day",
			accessUrl: "https://example.com/ufal-tech-day/profile/abc123?me=1",
		},
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
		await store.update(seeded.row.id, {
			status: "sent",
			sentAt: new Date(),
		});

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

	it("stores the rendered template version on the row", async () => {
		const { deps, input } = setup();
		const { notification } = await sendNotification(input, deps);

		expect(notification?.status).toBe("sent");
		expect(notification?.templateVersion).toBe("v1");
		expect(notification?.subject).toBe(
			"Inscrição confirmada: UFAL Tech Day",
		);
	});
});

describe("stuck claim recovery", () => {
	it("a fresh sending row is not claimed", async () => {
		const { store, send, deps, input } = setup();
		const { row } = await store.insertIgnore({
			type: input.type,
			idempotencyKey: input.idempotencyKey,
			to: input.to,
			eventId: input.eventId,
			payload: input.payload,
		});
		await store.claim(row.id);

		const result = await processNotification(row.id, deps);

		expect(send).not.toHaveBeenCalled();
		expect(result.notification?.status).toBe("sending");
	});

	it("a stale sending row is claimed exactly once even with concurrent callers", async () => {
		const { store, send, deps, input } = setup();
		const { row } = await store.insertIgnore({
			type: input.type,
			idempotencyKey: input.idempotencyKey,
			to: input.to,
			eventId: input.eventId,
			payload: input.payload,
		});
		await store.claim(row.id);
		const stuck = store.rows.get(row.id)!;
		stuck.updatedAt = new Date(Date.now() - STALE_CLAIM_TIMEOUT_MS - 1000);

		const results = await Promise.all(
			Array.from({ length: 3 }, () => processNotification(row.id, deps)),
		);

		expect(send).toHaveBeenCalledTimes(1);
		const ids = new Set(results.map((r) => r.notification?.id));
		expect(ids).toEqual(new Set([row.id]));
		await expect(store.getById(row.id)).resolves.toMatchObject({
			status: "sent",
		});
	});
});

describe("getEmailUsage", () => {
	it("returns the 24h count and the configured limit", async () => {
		const { store, deps } = setup({ dailyLimit: 100 });
		const seeded = await store.insertIgnore({
			type: "event_registration_confirmation",
			idempotencyKey: `seed-${randomUUID()}`,
			to: "other@example.com",
			eventId: null,
			payload: {},
		});
		await store.update(seeded.row.id, {
			status: "sent",
			sentAt: new Date(),
		});

		await expect(getEmailUsage(deps)).resolves.toEqual({
			sentLast24h: 1,
			limit: 100,
		});
	});

	it("counts a row created earlier but sent just now", async () => {
		const { store, deps } = setup({ dailyLimit: 100 });
		const seeded = await store.insertIgnore({
			type: "event_registration_confirmation",
			idempotencyKey: `seed-${randomUUID()}`,
			to: "other@example.com",
			eventId: null,
			payload: {},
		});
		const old = store.rows.get(seeded.row.id)!;
		old.createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
		old.updatedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
		await store.update(seeded.row.id, {
			status: "sent",
			sentAt: new Date(),
		});

		await expect(getEmailUsage(deps)).resolves.toEqual({
			sentLast24h: 1,
			limit: 100,
		});
	});

	it("ignores rows sent more than 24h ago", async () => {
		const { store, deps } = setup();
		const seeded = await store.insertIgnore({
			type: "event_registration_confirmation",
			idempotencyKey: `seed-${randomUUID()}`,
			to: "other@example.com",
			eventId: null,
			payload: {},
		});
		await store.update(seeded.row.id, {
			status: "sent",
			sentAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
		});

		await expect(getEmailUsage(deps)).resolves.toEqual({
			sentLast24h: 0,
			limit: null,
		});
	});

	it("returns a null limit when uncapped", async () => {
		const { deps } = setup();

		await expect(getEmailUsage(deps)).resolves.toEqual({
			sentLast24h: 0,
			limit: null,
		});
	});
});
