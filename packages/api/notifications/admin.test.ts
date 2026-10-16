import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@verific/drizzle", () => ({ db: {} }));
vi.mock("@verific/env", () => ({ env: {} }));

import {
	reprocessBatchNotifications,
	reprocessOneNotification,
} from "./service";
import { STALE_CLAIM_TIMEOUT_MS } from "./store";
import { InMemoryNotificationStore } from "./store.memory";

import type { NotificationRow } from "./store";
import type { EmailProvider, SendResult } from "./types";

const EVENT_A = randomUUID();
const EVENT_B = randomUUID();

function validPayload() {
	return {
		participantName: "Maria Silva",
		eventName: "UFAL Tech Day",
		accessUrl: "https://example.com/e/profile/abc?me=1",
	};
}

function setup(options?: {
	sendImpl?: (call: number) => SendResult | Promise<SendResult>;
	dailyLimit?: number;
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
		now: () => new Date(),
		sleep: vi.fn(async () => {}),
	};
	return { store, send, deps };
}

async function seed(
	store: InMemoryNotificationStore,
	overrides: Partial<NotificationRow> & { idempotencyKey: string },
): Promise<NotificationRow> {
	const { row } = await store.insertIgnore({
		type: "event_registration_confirmation",
		idempotencyKey: overrides.idempotencyKey,
		to: "user@example.com",
		eventId: EVENT_A,
		payload: validPayload(),
	});
	const full = store.rows.get(row.id)!;
	Object.assign(full, overrides, { id: row.id });
	return store.rows.get(row.id)!;
}

const freshSending = () => ({
	status: "sending" as const,
	updatedAt: new Date(),
});

const stuckSending = () => ({
	status: "sending" as const,
	updatedAt: new Date(Date.now() - STALE_CLAIM_TIMEOUT_MS - 1000),
});

describe("store.listPage", () => {
	it("scopes by event and never returns payload", async () => {
		const { store } = setup();
		await seed(store, { idempotencyKey: "a1" });
		await seed(store, { idempotencyKey: "a2" });
		await seed(store, {
			idempotencyKey: "b1",
			eventId: EVENT_B,
		});

		const { items, nextCursor } = await store.listPage({
			eventId: EVENT_A,
			filter: "all",
			limit: 10,
		});

		expect(items).toHaveLength(2);
		expect(nextCursor).toBeNull();
		for (const item of items) {
			expect(item.eventId).toBe(EVENT_A);
			expect(item).not.toHaveProperty("payload");
		}
	});

	it("attention covers pending, failed, blocked_quota and stuck only", async () => {
		const { store } = setup();
		await seed(store, { idempotencyKey: "p", status: "pending" });
		await seed(store, { idempotencyKey: "f", status: "failed" });
		await seed(store, {
			idempotencyKey: "b",
			status: "blocked_quota",
		});
		await seed(store, { idempotencyKey: "s", ...stuckSending() });
		await seed(store, { idempotencyKey: "fresh", ...freshSending() });
		await seed(store, {
			idempotencyKey: "sent",
			status: "sent",
			sentAt: new Date(),
		});

		const { items } = await store.listPage({
			eventId: EVENT_A,
			filter: "attention",
			limit: 10,
		});

		expect(items.map((i) => i.idempotencyKey).sort()).toEqual([
			"b",
			"f",
			"p",
			"s",
		]);
		expect(items.find((i) => i.idempotencyKey === "s")?.stuck).toBe(true);
	});

	it("sending filter returns fresh rows, stuck filter returns stuck rows", async () => {
		const { store } = setup();
		await seed(store, { idempotencyKey: "fresh", ...freshSending() });
		await seed(store, { idempotencyKey: "s", ...stuckSending() });

		const sending = await store.listPage({
			eventId: EVENT_A,
			filter: "sending",
			limit: 10,
		});
		const stuck = await store.listPage({
			eventId: EVENT_A,
			filter: "stuck",
			limit: 10,
		});

		expect(sending.items.map((i) => i.idempotencyKey)).toEqual(["fresh"]);
		expect(sending.items[0]?.stuck).toBe(false);
		expect(stuck.items.map((i) => i.idempotencyKey)).toEqual(["s"]);
	});

	it("pages newest-first with a (createdAt, id) cursor and no overlap", async () => {
		const { store } = setup();
		const base = Date.now();
		for (let i = 0; i < 5; i++) {
			const row = await seed(store, { idempotencyKey: `k${i}` });
			row.createdAt = new Date(base - i * 1000);
		}

		const page1 = await store.listPage({
			eventId: EVENT_A,
			filter: "all",
			limit: 2,
		});
		expect(page1.items.map((i) => i.idempotencyKey)).toEqual(["k0", "k1"]);
		expect(page1.nextCursor).not.toBeNull();

		const page2 = await store.listPage({
			eventId: EVENT_A,
			filter: "all",
			cursor: page1.nextCursor,
			limit: 2,
		});
		expect(page2.items.map((i) => i.idempotencyKey)).toEqual(["k2", "k3"]);

		const page3 = await store.listPage({
			eventId: EVENT_A,
			filter: "all",
			cursor: page2.nextCursor,
			limit: 2,
		});
		expect(page3.items.map((i) => i.idempotencyKey)).toEqual(["k4"]);
		expect(page3.nextCursor).toBeNull();
	});

	it("stuck derivation matches the threshold on both sides", async () => {
		const { store } = setup();
		await seed(store, {
			idempotencyKey: "barely-stuck",
			status: "sending",
			updatedAt: new Date(Date.now() - STALE_CLAIM_TIMEOUT_MS - 1),
		});
		await seed(store, {
			idempotencyKey: "barely-fresh",
			status: "sending",
			updatedAt: new Date(Date.now() - STALE_CLAIM_TIMEOUT_MS + 60_000),
		});

		const stuck = await store.listPage({
			eventId: EVENT_A,
			filter: "stuck",
			limit: 10,
		});
		const sending = await store.listPage({
			eventId: EVENT_A,
			filter: "sending",
			limit: 10,
		});

		expect(stuck.items.map((i) => i.idempotencyKey)).toEqual([
			"barely-stuck",
		]);
		expect(sending.items.map((i) => i.idempotencyKey)).toEqual([
			"barely-fresh",
		]);
	});
});

describe("store.statusCounts", () => {
	it("counts per event with stuck split out", async () => {
		const { store } = setup();
		await seed(store, { idempotencyKey: "p", status: "pending" });
		await seed(store, { idempotencyKey: "f", status: "failed" });
		await seed(store, { idempotencyKey: "fresh", ...freshSending() });
		await seed(store, { idempotencyKey: "s", ...stuckSending() });
		await seed(store, {
			idempotencyKey: "sent",
			status: "sent",
			sentAt: new Date(),
		});
		await seed(store, {
			idempotencyKey: "other",
			eventId: EVENT_B,
			status: "failed",
		});

		await expect(store.statusCounts(EVENT_A)).resolves.toEqual({
			pending: 1,
			sending: 1,
			stuck: 1,
			sent: 1,
			failed: 1,
			blocked_quota: 0,
		});
	});
});

describe("reprocessOneNotification", () => {
	it("returns null for missing or foreign rows without sending", async () => {
		const { store, send, deps } = setup();
		const foreign = await seed(store, {
			idempotencyKey: "foreign",
			eventId: EVENT_B,
			status: "failed",
		});

		await expect(
			reprocessOneNotification(
				{ eventId: EVENT_A, id: foreign.id },
				deps,
			),
		).resolves.toEqual({ notification: null });
		await expect(
			reprocessOneNotification(
				{ eventId: EVENT_A, id: randomUUID() },
				deps,
			),
		).resolves.toEqual({ notification: null });
		expect(send).not.toHaveBeenCalled();
	});

	it("returns sent and fresh sending rows untouched without payload", async () => {
		const { store, send, deps } = setup();
		const sent = await seed(store, {
			idempotencyKey: "sent",
			status: "sent",
			sentAt: new Date(),
		});
		const fresh = await seed(store, {
			idempotencyKey: "fresh",
			...freshSending(),
		});

		for (const row of [sent, fresh]) {
			const { notification } = await reprocessOneNotification(
				{ eventId: EVENT_A, id: row.id },
				deps,
			);
			expect(notification?.status).toBe(row.status);
			expect(notification).not.toHaveProperty("payload");
		}
		expect(send).not.toHaveBeenCalled();
	});

	it("sends failed and stale rows", async () => {
		const { store, send, deps } = setup();
		const failed = await seed(store, {
			idempotencyKey: "failed",
			status: "failed",
		});
		const stuck = await seed(store, {
			idempotencyKey: "stuck",
			...stuckSending(),
		});

		for (const row of [failed, stuck]) {
			const { notification } = await reprocessOneNotification(
				{ eventId: EVENT_A, id: row.id },
				deps,
			);
			expect(notification?.status).toBe("sent");
			expect(notification?.templateVersion).toBe("v3");
		}
		expect(send).toHaveBeenCalledTimes(2);
	});
});

describe("reprocessBatchNotifications", () => {
	it("processes only attention rows and reports counts", async () => {
		const { store, send, deps } = setup();
		await seed(store, { idempotencyKey: "p1", status: "pending" });
		await seed(store, { idempotencyKey: "p2", status: "pending" });
		await seed(store, {
			idempotencyKey: "sent",
			status: "sent",
			sentAt: new Date(),
		});
		await seed(store, { idempotencyKey: "fresh", ...freshSending() });

		const result = await reprocessBatchNotifications(
			{ eventId: EVENT_A, filter: "attention", limit: 20 },
			deps,
		);

		expect(send).toHaveBeenCalledTimes(2);
		expect(result).toMatchObject({
			processed: 2,
			succeeded: 2,
			failed: 0,
			skipped: 0,
			nextCursor: null,
			capReached: false,
		});
		expect(JSON.stringify(result)).not.toContain("payload");
	});

	it("skips sent rows listed by broad filters without sending", async () => {
		const { store, send, deps } = setup();
		await seed(store, {
			idempotencyKey: "sent",
			status: "sent",
			sentAt: new Date(),
		});

		const result = await reprocessBatchNotifications(
			{ eventId: EVENT_A, filter: "all", limit: 20 },
			deps,
		);

		expect(send).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			processed: 1,
			succeeded: 0,
			failed: 0,
			skipped: 1,
		});
	});

	it("pages with the cursor and never retries a failed row in one run", async () => {
		const { store, send, deps } = setup({
			sendImpl: () => ({
				ok: false,
				retryable: false,
				code: "validation_error",
				message: "bad address",
			}),
		});
		for (let i = 0; i < 3; i++) {
			await seed(store, { idempotencyKey: `k${i}`, status: "pending" });
		}

		const first = await reprocessBatchNotifications(
			{ eventId: EVENT_A, filter: "attention", limit: 2 },
			deps,
		);
		expect(first).toMatchObject({
			processed: 2,
			failed: 2,
			nextCursor: expect.anything(),
		});
		expect(send).toHaveBeenCalledTimes(2);

		const second = await reprocessBatchNotifications(
			{
				eventId: EVENT_A,
				filter: "attention",
				cursor: first.nextCursor,
				limit: 2,
			},
			deps,
		);
		expect(second).toMatchObject({
			processed: 1,
			failed: 1,
			nextCursor: null,
		});
		expect(send).toHaveBeenCalledTimes(3);
	});

	it("enforces the cap and reports capReached", async () => {
		const { store, send, deps } = setup({ dailyLimit: 2 });
		await seed(store, {
			idempotencyKey: "used",
			status: "sent",
			sentAt: new Date(),
		});
		await seed(store, { idempotencyKey: "p1", status: "pending" });
		await seed(store, { idempotencyKey: "p2", status: "pending" });

		const result = await reprocessBatchNotifications(
			{ eventId: EVENT_A, filter: "attention", limit: 20 },
			deps,
		);

		expect(send).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({
			processed: 1,
			succeeded: 1,
			capReached: true,
		});
	});

	it("stops immediately when the cap is already reached", async () => {
		const { store, send, deps } = setup({ dailyLimit: 1 });
		await seed(store, {
			idempotencyKey: "used",
			status: "sent",
			sentAt: new Date(),
		});
		await seed(store, { idempotencyKey: "p1", status: "pending" });

		const result = await reprocessBatchNotifications(
			{ eventId: EVENT_A, filter: "attention", limit: 20 },
			deps,
		);

		expect(send).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			processed: 0,
			nextCursor: null,
			capReached: true,
		});
	});

	it("counts provider quota outcomes as failed", async () => {
		const { store, send, deps } = setup({
			sendImpl: () => ({
				ok: false,
				retryable: false,
				code: "provider_quota",
				message: "quota exceeded",
			}),
		});
		await seed(store, { idempotencyKey: "p1", status: "pending" });

		const result = await reprocessBatchNotifications(
			{ eventId: EVENT_A, filter: "attention", limit: 20 },
			deps,
		);

		expect(send).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({
			processed: 1,
			succeeded: 0,
			failed: 1,
		});
	});
});
