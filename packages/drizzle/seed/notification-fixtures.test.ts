import { describe, expect, it } from "vitest";

import { buildNotificationFixtures } from "./notification-fixtures";

import type { NotificationFixtureInput } from "./notification-fixtures";

const refDate = new Date("2026-10-18T03:00:00.000Z");
const now = new Date("2026-10-18T15:00:00.000Z");

function input(
	overrides: Partial<NotificationFixtureInput> = {},
): NotificationFixtureInput {
	return {
		projectId: "11111111-1111-4111-8111-111111111111",
		participants: [
			{ id: "p1", email: "ana@seed.verific.test" },
			{ id: "p2", email: "bia@seed.verific.test" },
			{ id: "p3", email: "caio@seed.verific.test" },
		],
		enrollments: [
			{
				activityId: "a1",
				participantId: "p1",
				subscribedAt: new Date("2026-10-01T10:00:00.000Z"),
			},
			{
				activityId: "a2",
				participantId: "p2",
				subscribedAt: new Date("2026-10-02T10:00:00.000Z"),
			},
		],
		ownerEmail: "dono@seed.verific.test",
		refDate,
		now,
		...overrides,
	};
}

describe("buildNotificationFixtures", () => {
	it("cobre todos os estados da página de e-mails", () => {
		const rows = buildNotificationFixtures(input());
		const statuses = new Set(rows.map((row) => row.status));
		for (const status of [
			"pending",
			"sending",
			"sent",
			"failed",
			"blocked_quota",
			"skipped",
		]) {
			expect(statuses.has(status as never)).toBe(true);
		}
	});

	it("inclui as linhas de atividade e o aviso de limite", () => {
		const rows = buildNotificationFixtures(input());
		const types = rows.map((row) => row.type);
		expect(types).toContain("activity_enrollment_confirmed");
		expect(types).toContain("email_quota_warning");
		expect(rows.some((row) => row.status === "blocked_quota")).toBe(true);
	});

	it("usa entityRefs reais e e-mails dos inscritos", () => {
		const rows = buildNotificationFixtures(input());
		const emails = new Set([
			"ana@seed.verific.test",
			"bia@seed.verific.test",
			"caio@seed.verific.test",
		]);
		for (const row of rows) {
			expect(row.eventId).toBe(input().projectId);
			expect(row.recipientEmail).toBeTruthy();
			// A linha do organizador pode ter o e-mail do dono; as demais são
			// de inscritos.
			if (row.type !== "email_quota_warning") {
				expect(emails.has(row.recipientEmail)).toBe(true);
			}
		}
		const enrollment = rows.find(
			(row) => row.type === "activity_enrollment_confirmed",
		);
		expect(enrollment?.entityRefs).toMatchObject({
			activityId: "a1",
			participantId: "p1",
			subscribedAt: "2026-10-01T10:00:00.000Z",
		});
	});

	it("separa uma linha enviando de uma travada (claim antigo)", () => {
		const rows = buildNotificationFixtures(input());
		const sending = rows.filter((row) => row.status === "sending");
		expect(sending).toHaveLength(2);
		const staleBefore = new Date(now.getTime() - 10 * 60_000);
		const stuck = sending.filter(
			(row) => (row.updatedAt as Date) < staleBefore,
		);
		const fresh = sending.filter(
			(row) => (row.updatedAt as Date) >= staleBefore,
		);
		expect(stuck).toHaveLength(1);
		expect(fresh).toHaveLength(1);
	});

	it("usa chaves de idempotência únicas", () => {
		const rows = buildNotificationFixtures(input());
		const keys = new Set(rows.map((row) => row.idempotencyKey));
		expect(keys.size).toBe(rows.length);
	});

	it("é determinístico (mesma semente, mesmas linhas)", () => {
		expect(buildNotificationFixtures(input())).toEqual(
			buildNotificationFixtures(input()),
		);
	});

	it("omite as linhas de atividade sem inscrições", () => {
		const rows = buildNotificationFixtures(input({ enrollments: [] }));
		expect(rows.some((row) => row.type.startsWith("activity_"))).toBe(
			false,
		);
	});

	it("omite o aviso de limite sem e-mail do organizador", () => {
		const rows = buildNotificationFixtures(input({ ownerEmail: null }));
		expect(rows.some((row) => row.type === "email_quota_warning")).toBe(
			false,
		);
	});

	it("não gera nada sem inscritos", () => {
		expect(buildNotificationFixtures(input({ participants: [] }))).toEqual(
			[],
		);
	});
});
