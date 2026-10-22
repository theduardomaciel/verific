import { describe, expect, it, vi } from "vitest";

vi.mock("./lib/gamification", () => ({ awardEnrollment: vi.fn() }));
vi.mock("./routers/forms", () => ({
	buildAnswerRows: vi.fn(),
	getPublishedVersionWithFields: vi.fn(),
	toValidationFields: vi.fn(),
	toVisibilitySections: vi.fn(),
}));

import { assertNoScheduleConflict } from "./enrollment";

import type { Tx } from "./seats";

const SESSION = {
	startsAt: new Date("2099-11-10T14:00:00Z"),
	endsAt: new Date("2099-11-10T16:00:00Z"),
};

function txWith(enrolled: { cancelledAt: Date | null }) {
	return {
		query: {
			activity: {
				findFirst: async () => ({
					id: "target",
					name: "Alvo",
					workload: null,
					allowOverlap: false,
					sessions: [SESSION],
				}),
			},
			participantOnActivity: {
				findMany: async () => [
					{
						activity: {
							id: "other",
							name: "Outra",
							workload: null,
							allowOverlap: false,
							cancelledAt: enrolled.cancelledAt,
							sessions: [SESSION],
						},
					},
				],
			},
		},
	} as unknown as Tx;
}

describe("assertNoScheduleConflict", () => {
	it("recusa inscrição no mesmo horário de outra atividade", async () => {
		await expect(
			assertNoScheduleConflict(
				txWith({ cancelledAt: null }),
				"target",
				"p1",
			),
		).rejects.toMatchObject({ cause: { code: "SCHEDULE_CONFLICT" } });
	});

	it("ignora inscrição em atividade cancelada", async () => {
		await expect(
			assertNoScheduleConflict(
				txWith({ cancelledAt: new Date("2099-11-01T00:00:00Z") }),
				"target",
				"p1",
			),
		).resolves.toBeUndefined();
	});
});
