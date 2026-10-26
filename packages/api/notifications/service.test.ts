import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import type { NotificationTypeDefinition, ValidationResult } from "./registry";

vi.mock("@verific/drizzle", () => ({
	db: {
		select: () => ({
			from: () => ({
				innerJoin: () => ({
					where: async () => [{ email: "owner@example.com" }],
				}),
			}),
		}),
	},
}));
vi.mock("@verific/env", () => ({
	env: {},
	appUrl: "https://example.com",
}));
vi.mock("./settings", () => ({
	isNotificationEnabled: vi.fn(async () => true),
	getNotificationEnabledMap: vi.fn(async () => new Map<string, boolean>()),
}));

const { stubDefinition, stubMocks, quotaStubDefinition } = vi.hoisted(() => {
	const validate = vi.fn(async (): Promise<ValidationResult> => ({
		ok: true,
	}));
	const buildProps = vi.fn(async (): Promise<Record<string, unknown>> => ({
		participantName: "Maria Silva",
		eventName: "UFAL Tech Day",
		accessUrl: "https://example.com/ufal-tech-day/profile/abc123?me=1",
	}));
	const stubDefinition: NotificationTypeDefinition = {
		key: "event_registration_confirmation" as const,
		audience: "participant" as const,
		category: "transactional" as const,
		scope: "event" as const,
		defaultEnabled: true,
		description: "stub",
		entityRefs: ["registrationId"],
		idempotencyKeyFormat: "stub:{registrationId}",
		buildIdempotencyKey: vi.fn(() => "stub-key"),
		validate,
		buildProps,
		subject: vi.fn(() => "Inscrição confirmada: UFAL Tech Day"),
		render: vi.fn(async (props: Record<string, unknown>) => ({
			subject: "Inscrição confirmada: UFAL Tech Day",
			html: `<html>${JSON.stringify(props)}</html>`,
			text: JSON.stringify(props),
			templateVersion: "v3",
		})),
		templateVersion: "v3",
		previewProps: {},
	};
	const quotaStubDefinition: NotificationTypeDefinition = {
		key: "email_quota_warning" as const,
		audience: "organizer" as const,
		category: "transactional" as const,
		scope: "event" as const,
		defaultEnabled: true,
		description: "stub",
		entityRefs: ["projectId", "used", "limit", "day"],
		idempotencyKeyFormat: "email_quota_warning:{day}",
		buildIdempotencyKey: (refs) =>
			`email_quota_warning:${String(refs["day"])}`,
		validate: vi.fn(async () => ({ ok: true as const })),
		buildProps: vi.fn(async () => ({
			organizerName: "João",
			eventName: "UFAL Tech Day",
			used: 4,
			limit: 5,
			day: "2025-12-31",
			accessUrl: "https://example.com/dashboard/emails",
		})),
		subject: vi.fn(() => "Atenção: 80% da cota"),
		render: vi.fn(async () => ({
			subject: "Atenção: 80% da cota",
			html: "<html>quota</html>",
			text: "quota",
			templateVersion: "v1",
		})),
		templateVersion: "v1",
		previewProps: {},
	};
	return {
		stubDefinition,
		stubMocks: { validate, buildProps },
		quotaStubDefinition,
	};
});

vi.mock("./registry", async (importOriginal) => {
	const original = (await importOriginal()) as unknown as Record<
		string,
		unknown
	>;
	return {
		...original,
		getNotificationDefinition: vi.fn(
			(type: string) =>
				(type === "email_quota_warning"
					? quotaStubDefinition
					: stubDefinition) as never,
		),
	};
});

import { hashProps, InvalidEntityRefsError } from "./registry";
import {
	getEmailUsage,
	processNotification,
	processQueuedNotifications,
	enqueueNotifications,
	sendNotification,
	truncateMessage,
} from "./service";
import { isNotificationEnabled, getNotificationEnabledMap } from "./settings";
import { STALE_CLAIM_TIMEOUT_MS } from "./store";
import { InMemoryNotificationStore } from "./store.memory";

import type {
	EmailMessage,
	EmailProvider,
	SendNotificationInput,
	SendResult,
} from "./types";

const isNotificationEnabledMock = vi.mocked(isNotificationEnabled);
const getNotificationEnabledMapMock = vi.mocked(getNotificationEnabledMap);

function setup(options?: {
	sendImpl?: (call: number) => SendResult | Promise<SendResult>;
	dailyLimit?: number;
}) {
	const store = new InMemoryNotificationStore();
	let call = 0;
	const send = vi.fn(async (_msg: EmailMessage) => {
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
		sleep: vi.fn(async () => {}),
	};
	const input: SendNotificationInput = {
		type: "event_registration_confirmation",
		idempotencyKey: `key-${randomUUID()}`,
		to: "user@example.com",
		eventId: randomUUID(),
		entityRefs: { registrationId: randomUUID() },
	};
	return { store, send, deps, input };
}

/** Seeds a `sent` row so the 24h usage reaches a given value. */
async function seedSent(
	store: InMemoryNotificationStore,
	count: number,
): Promise<void> {
	for (let i = 0; i < count; i += 1) {
		const seeded = await store.insertIgnore({
			type: "event_registration_confirmation",
			idempotencyKey: `seed-${randomUUID()}`,
			to: "other@example.com",
			eventId: null,
			entityRefs: {},
		});
		await store.update(seeded.row.id, {
			status: "sent",
			sentAt: new Date(),
		});
	}
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
		await seedSent(store, 1);

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

	it("stores the rendered template version and props hash on the row", async () => {
		const { deps, input } = setup();
		const { notification } = await sendNotification(input, deps);

		expect(notification?.status).toBe("sent");
		expect(notification?.templateVersion).toBe("v3");
		expect(notification?.subject).toBe(
			"Inscrição confirmada: UFAL Tech Day",
		);
		expect(notification?.propsHash).toMatch(/^[0-9a-f]{64}$/);
		// Template output is never stored.
		expect(JSON.stringify(notification)).not.toContain("<html>");
	});
});

describe("gating", () => {
	it("records a disabled type as skipped without sending", async () => {
		isNotificationEnabledMock.mockResolvedValueOnce(false);
		const { send, deps, input } = setup();

		const { notification } = await sendNotification(input, deps);

		expect(send).not.toHaveBeenCalled();
		expect(notification?.status).toBe("skipped");
		expect(notification?.skipReason).toBe("disabled_by_event");
		expect(notification?.entityRefs).toEqual(input.entityRefs);
	});

	it("processNotification re-checks the gate and skips", async () => {
		const { store, send, deps, input } = setup();
		const { row } = await store.insertIgnore({
			type: input.type,
			idempotencyKey: input.idempotencyKey,
			to: input.to,
			eventId: input.eventId,
			entityRefs: input.entityRefs,
		});
		isNotificationEnabledMock.mockResolvedValueOnce(false);

		const { notification } = await processNotification(row.id, deps);

		expect(send).not.toHaveBeenCalled();
		expect(notification?.status).toBe("skipped");
		expect(notification?.skipReason).toBe("disabled_by_event");
	});

	it("skipped rows never count toward the daily usage", async () => {
		const { store, deps } = setup();
		const { row } = await store.insertIgnore({
			type: "event_registration_confirmation",
			idempotencyKey: "skipped-row",
			to: "user@example.com",
			eventId: null,
			entityRefs: {},
			status: "skipped",
			skipReason: "disabled_by_event",
		});
		expect(row.status).toBe("skipped");

		await expect(getEmailUsage(deps)).resolves.toEqual({
			sentLast24h: 0,
			limit: null,
		});
	});
});

describe("validate skip paths", () => {
	it.each(["entity_gone", "state_changed"] as const)(
		"records %s as skipped, not failed",
		async (reason) => {
			const { store, send, deps, input } = setup();
			const { row } = await store.insertIgnore({
				type: input.type,
				idempotencyKey: input.idempotencyKey,
				to: input.to,
				eventId: input.eventId,
				entityRefs: input.entityRefs,
			});
			stubMocks.validate.mockResolvedValueOnce({
				ok: false,
				reason,
			});

			const { notification } = await processNotification(row.id, deps);

			expect(send).not.toHaveBeenCalled();
			expect(notification?.status).toBe("skipped");
			expect(notification?.skipReason).toBe(reason);
			expect(notification?.lastError).toBe(`skip: ${reason}`);
		},
	);

	it("records an unknown type as skipped with unsupported_type", async () => {
		const { getNotificationDefinition } = await import("./registry");
		const { store, send, deps } = setup();
		const { row } = await store.insertIgnore({
			type: "activity_reminder",
			idempotencyKey: "unsupported",
			to: "user@example.com",
			eventId: null,
			entityRefs: {},
		});
		vi.mocked(getNotificationDefinition).mockReturnValueOnce(null);

		const { notification } = await processNotification(row.id, deps);

		expect(send).not.toHaveBeenCalled();
		expect(notification?.status).toBe("skipped");
		expect(notification?.skipReason).toBe("unsupported_type");
	});
});

describe("reprocess rebuilds props", () => {
	it("rebuilds from entityRefs on every attempt and stores only the hash", async () => {
		const { store, send, deps, input } = setup({
			sendImpl: (call) =>
				call === 1
					? {
							ok: false,
							retryable: false,
							code: "validation_error",
							message: "bad address",
						}
					: { ok: true, providerMessageId: "msg-ok" },
		});
		const { row } = await store.insertIgnore({
			type: input.type,
			idempotencyKey: input.idempotencyKey,
			to: input.to,
			eventId: input.eventId,
			entityRefs: input.entityRefs,
		});

		const first = await processNotification(row.id, deps);
		expect(first.notification?.status).toBe("failed");

		const updatedProps = {
			participantName: "Maria Silva",
			eventName: "UFAL Tech Day",
			activityName: "Oficina de React",
			accessUrl: "https://example.com/ufal-tech-day/profile/abc123?me=1",
		};
		stubMocks.buildProps.mockResolvedValueOnce(updatedProps);

		const second = await processNotification(row.id, deps);

		expect(second.notification?.status).toBe("sent");
		expect(send.mock.calls[1]?.[0]?.html).toContain("Oficina de React");
		expect(second.notification?.propsHash).toBe(hashProps(updatedProps));
		expect(second.notification?.entityRefs).toEqual(input.entityRefs);
		expect(stubMocks.validate).toHaveBeenCalledTimes(2);
		expect(stubMocks.buildProps).toHaveBeenCalledTimes(2);
	});
});

describe("bulk enqueue and processing", () => {
	it("enqueues gated rows as skipped in one batch", async () => {
		const { store, deps } = setup();
		getNotificationEnabledMapMock.mockResolvedValueOnce(
			new Map([["event_registration_confirmation", false]]),
		);
		const input: SendNotificationInput = {
			type: "event_registration_confirmation",
			idempotencyKey: "bulk-1",
			to: "user@example.com",
			eventId: randomUUID(),
			entityRefs: { registrationId: randomUUID() },
		};

		const [result] = await enqueueNotifications([input], deps);

		expect(result?.notification?.status).toBe("skipped");
		expect(result?.notification?.skipReason).toBe("disabled_by_event");
		expect(store.rows.size).toBe(1);
	});

	it("respects EMAIL_DAILY_LIMIT and leaves the rest pending", async () => {
		const { store, send, deps } = setup({ dailyLimit: 2 });
		const inputs: SendNotificationInput[] = Array.from(
			{ length: 3 },
			(_, index) => ({
				type: "event_registration_confirmation" as const,
				idempotencyKey: `bulk-${index}`,
				to: "user@example.com",
				eventId: randomUUID(),
				entityRefs: { registrationId: randomUUID() },
			}),
		);
		const enqueued = await enqueueNotifications(inputs, deps);
		const ids = enqueued.map((result) => result.notification!.id);

		const result = await processQueuedNotifications(ids, deps);

		expect(send).toHaveBeenCalledTimes(2);
		expect(result).toEqual({
			processed: 2,
			sent: 2,
			skipped: 0,
			failed: 0,
			remaining: 1,
			capReached: true,
		});
		expect(store.rows.get(ids[2]!)?.status).toBe("pending");
		// The leftover stays reprocessable from the admin page.
		expect(store.rows.get(ids[0]!)?.status).toBe("sent");
	});
});

describe("bulk processing round trips", () => {
	it("lê o uso e a configuração do evento uma vez por lote", async () => {
		const { store, send, deps } = setup({ dailyLimit: 100 });
		const eventId = randomUUID();
		const enqueued = await enqueueNotifications(
			Array.from({ length: 3 }, (_, index) => ({
				type: "event_registration_confirmation" as const,
				idempotencyKey: `round-${index}`,
				to: "user@example.com",
				eventId,
				entityRefs: { registrationId: randomUUID() },
			})),
			deps,
		);
		const countUsage = vi.spyOn(store, "countUsageLast24h");
		isNotificationEnabledMock.mockClear();

		await processQueuedNotifications(
			enqueued.map((result) => result.notification!.id),
			deps,
		);

		expect(send).toHaveBeenCalledTimes(3);
		// Uma leitura para o lote e uma para o aviso de cota no fim
		expect(countUsage).toHaveBeenCalledTimes(2);
		expect(isNotificationEnabledMock).toHaveBeenCalledTimes(1);
	});
});

describe("quota warning", () => {
	it("sends one warning per day when usage crosses 80% of the limit", async () => {
		const { store, send, deps, input } = setup({ dailyLimit: 5 });
		await seedSent(store, 3);

		const { notification } = await sendNotification(input, deps);

		expect(notification?.status).toBe("sent");
		expect(send).toHaveBeenCalledTimes(2);
		const warning = [...store.rows.values()].find(
			(row) => row.type === "email_quota_warning",
		);
		const day = new Intl.DateTimeFormat("en-CA", {
			timeZone: "America/Sao_Paulo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(new Date());
		expect(warning?.idempotencyKey).toBe(`email_quota_warning:${day}`);
		expect(warning?.recipientEmail).toBe("owner@example.com");
		expect(warning?.status).toBe("sent");

		// Replaying the same day never sends again.
		await sendNotification(input, deps);
		expect(send).toHaveBeenCalledTimes(2);
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
			entityRefs: input.entityRefs,
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
			entityRefs: input.entityRefs,
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
		await seedSent(store, 1);

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
			entityRefs: {},
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
			entityRefs: {},
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

describe("entityRefs validation at creation", () => {
	it.each([
		["missing required ref", {}],
		["null ref", { registrationId: null }],
		["empty ref", { registrationId: "  " }],
		["unknown ref", { registrationId: "p1", extra: "x" }],
	])(
		"sendNotification throws and inserts nothing for %s",
		async (_label, entityRefs) => {
			const { store, send, deps } = setup();
			const bad: SendNotificationInput = {
				type: "event_registration_confirmation",
				idempotencyKey: "bad-refs",
				to: "user@example.com",
				eventId: randomUUID(),
				entityRefs,
			};

			await expect(sendNotification(bad, deps)).rejects.toBeInstanceOf(
				InvalidEntityRefsError,
			);
			expect(store.rows.size).toBe(0);
			expect(send).not.toHaveBeenCalled();
		},
	);

	it("the error names the type and the missing ref", async () => {
		const { deps } = setup();
		const bad: SendNotificationInput = {
			type: "event_registration_confirmation",
			idempotencyKey: "bad-refs",
			to: "user@example.com",
			eventId: randomUUID(),
			entityRefs: {},
		};

		await expect(sendNotification(bad, deps)).rejects.toThrow(
			/event_registration_confirmation.*registrationId/,
		);
	});

	it("enqueueNotifications drops invalid inputs and keeps valid ones", async () => {
		const errorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const { deps } = setup();
		const eventId = randomUUID();
		const invalid: SendNotificationInput = {
			type: "event_registration_confirmation",
			idempotencyKey: "bad-bulk",
			to: "user@example.com",
			eventId,
			entityRefs: {},
		};
		const valid: SendNotificationInput = {
			type: "event_registration_confirmation",
			idempotencyKey: "ok-bulk",
			to: "user@example.com",
			eventId,
			entityRefs: { registrationId: "p1" },
		};

		const results = await enqueueNotifications([invalid, valid], deps);

		expect(results).toHaveLength(1);
		expect(results[0]?.notification?.idempotencyKey).toBe("ok-bulk");
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("event_registration_confirmation"),
			expect.any(InvalidEntityRefsError),
		);
		errorSpy.mockRestore();
	});
});

describe("catch-all error visibility", () => {
	it("stores the original error name and a truncated message", async () => {
		const errorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const { store, deps, input } = setup();
		const { row } = await store.insertIgnore({
			type: input.type,
			idempotencyKey: input.idempotencyKey,
			to: input.to,
			eventId: input.eventId,
			entityRefs: input.entityRefs,
		});
		vi.spyOn(store, "claim").mockRejectedValue(
			new TypeError("cannot read property of undefined"),
		);

		const { notification } = await processNotification(row.id, deps);

		expect(notification?.status).toBe("failed");
		expect(notification?.lastError).toBe(
			"unexpected_error: TypeError: cannot read property of undefined",
		);
		expect(notification?.lastErrorRetryable).toBe(false);
		// Log completo com id, tipo e refs.
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining(`id=${row.id}`),
			expect.any(TypeError),
		);
		errorSpy.mockRestore();
	});

	it("truncateMessage caps the stored message around 300 chars", () => {
		const long = "x".repeat(1000);
		const truncated = truncateMessage(long);
		expect(truncated.length).toBeLessThanOrEqual(301);
		expect(truncated).toMatch(/…$/);
		expect(truncateMessage("short")).toBe("short");
	});
});
