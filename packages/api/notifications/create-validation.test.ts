import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => {
	const chain: Record<string, unknown> = {};
	chain["from"] = () => chain;
	chain["innerJoin"] = () => chain;
	chain["leftJoin"] = () => chain;
	chain["where"] = async () => [];
	return { dbMock: { select: () => chain } };
});

vi.mock("@verific/drizzle", () => ({ db: dbMock }));
vi.mock("@verific/env", () => ({
	env: {},
	appUrl: "https://example.com",
}));
// Gate fechado: a criação valida refs + insere a row e encerra antes do
// pipeline de render (que exigiria um banco real). É exatamente o contrato
// em teste: criar a row, não enviá-la.
vi.mock("./settings", () => ({
	isNotificationEnabled: vi.fn(async () => false),
	getNotificationEnabledMap: vi.fn(async () => new Map<string, boolean>()),
}));

import {
	InvalidEntityRefsError,
	notificationRegistry,
	validateEntityRefs,
} from "./registry";
import { enqueueNotifications, sendNotification } from "./service";
import { InMemoryNotificationStore } from "./store.memory";
import { NOTIFICATION_TYPE_KEYS } from "./types";

import type { NotificationRow } from "./store";
import type {
	EntityRefValue,
	EntityRefs,
	SendNotificationInput,
} from "./types";

const EVENT_ID = randomUUID();

/** Value that satisfies every declared ref name pattern. */
function valueFor(name: string): EntityRefValue {
	if (name === "used" || name === "limit") return 7;
	if (name.endsWith("Id")) return randomUUID();
	if (name.endsWith("At")) return new Date().toISOString();
	if (name === "day") return "2026-04-12";
	return `valor-${name}`;
}

/** Valid refs built from the declaration itself (the source of truth). */
function validRefsFor(type: keyof typeof notificationRegistry): EntityRefs {
	const refs: EntityRefs = {};
	for (const entry of notificationRegistry[type].entityRefs) {
		if (entry.endsWith("?")) continue;
		refs[entry] = valueFor(entry);
	}
	return refs;
}

function setup() {
	const store = new InMemoryNotificationStore();
	const deps = {
		store,
		config: {
			provider: "console" as const,
			from: "Verific <nao-responder@example.com>",
		},
	};
	return { store, deps };
}

describe("valid creation for every registered type", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("NotificationRow no longer has the legacy payload column", () => {
		// Compile-time: "payload" must not be a key of NotificationRow.
		const probe: "payload" extends keyof NotificationRow ? never : true =
			true;
		expect(probe).toBe(true);
	});

	it.each([...NOTIFICATION_TYPE_KEYS])(
		"%s accepts refs built from its declared entityRefs",
		async (type) => {
			const { store, deps } = setup();
			const entityRefs = validRefsFor(type);

			const { notification } = await sendNotification(
				{
					type,
					idempotencyKey: `key-${randomUUID()}`,
					to: "user@example.com",
					eventId: EVENT_ID,
					entityRefs,
				},
				deps,
			);

			expect(notification).not.toBeNull();
			expect(notification?.entityRefs).toEqual(entityRefs);
			// Gate fechado: criada e registrada como skipped, sem envio.
			expect(notification?.status).toBe("skipped");
			expect(store.rows.size).toBe(1);
		},
	);

	it.each([...NOTIFICATION_TYPE_KEYS])(
		"enqueueNotifications creates a row with valid refs for %s",
		async (type) => {
			const { deps } = setup();
			const entityRefs = validRefsFor(type);

			const [result] = await enqueueNotifications(
				[
					{
						type,
						idempotencyKey: `key-${randomUUID()}`,
						to: "user@example.com",
						eventId: EVENT_ID,
						entityRefs,
					},
				],
				deps,
			);

			expect(result?.notification).not.toBeNull();
			expect(result?.notification?.entityRefs).toEqual(entityRefs);
		},
	);
});

describe("invalid refs are rejected at creation", () => {
	it.each([...NOTIFICATION_TYPE_KEYS])(
		"%s throws naming the type and the missing ref",
		async (type) => {
			const { store, deps } = setup();
			const required = notificationRegistry[type].entityRefs.filter(
				(entry) => !entry.endsWith("?"),
			);
			expect(required.length).toBeGreaterThan(0);

			const input: SendNotificationInput = {
				type,
				idempotencyKey: `key-${randomUUID()}`,
				to: "user@example.com",
				eventId: EVENT_ID,
				entityRefs: {},
			};

			await expect(sendNotification(input, deps)).rejects.toThrow(
				InvalidEntityRefsError,
			);
			// A mensagem nomeia o tipo e a ref obrigatória que faltou.
			const escape = (text: string) =>
				text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			await expect(sendNotification(input, deps)).rejects.toThrow(
				new RegExp(`${escape(type)}.*"${escape(required[0]!)}"`),
			);
			expect(store.rows.size).toBe(0);
		},
	);

	it("validateEntityRefs rejects empty strings and unknown keys", () => {
		expect(() =>
			validateEntityRefs("event_registration_confirmation", {
				registrationId: "  ",
			}),
		).toThrow(InvalidEntityRefsError);
		expect(() =>
			validateEntityRefs("event_registration_confirmation", {
				registrationId: "p1",
				reason: "não declarada",
			}),
		).toThrow(/desconhecida/);
	});

	it("validateEntityRefs ignores unknown types (unsupported_type later)", () => {
		expect(() =>
			validateEntityRefs("activity_reminder", { whatever: 1 }),
		).not.toThrow();
	});

	it("validateEntityRefs accepts declared optional refs", () => {
		expect(() =>
			validateEntityRefs("activity_cancelled", {
				activityId: "a1",
				participantId: "p1",
				reason: "chuva",
			}),
		).not.toThrow();
		expect(() =>
			validateEntityRefs("activity_cancelled", {
				activityId: "a1",
				participantId: "p1",
			}),
		).not.toThrow();
	});
});
