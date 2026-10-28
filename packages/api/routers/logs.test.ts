import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

const { requireProjectAccess, selectResult } = vi.hoisted(() => ({
	requireProjectAccess: vi.fn(),
	selectResult: { rows: [] as unknown[] },
}));

vi.mock("../lib/project-access", () => ({ requireProjectAccess }));

vi.mock("@verific/drizzle", () => {
	const chain = {
		from: () => chain,
		where: () => chain,
		orderBy: () => chain,
		limit: async () => selectResult.rows,
	};
	return { db: { select: () => chain } };
});

import { createCallerFactory } from "../trpc";
import { logsRouter } from "./logs";

const createCaller = createCallerFactory(logsRouter);
const caller = createCaller({
	session: { user: { id: "user-1" } } as unknown as Session,
});

const PROJECT_ID = "00000000-0000-4000-8000-000000000000";

function row(overrides: Record<string, unknown> = {}) {
	return {
		id: "00000000-0000-4000-8000-000000000001",
		projectId: PROJECT_ID,
		activityId: null,
		participantId: null,
		actorUserId: null,
		type: "reception.checkin" as const,
		activityName: null,
		participantName: "Ana",
		actorName: null,
		metadata: { day: "2026-01-01" },
		createdAt: new Date("2026-01-01T12:00:00.000Z"),
		...overrides,
	};
}

describe("getActivityLog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireProjectAccess.mockResolvedValue({});
		selectResult.rows = [];
	});

	it("rejects when the caller cannot access the event", async () => {
		requireProjectAccess.mockRejectedValue(new Error("forbidden"));
		await expect(
			caller.getActivityLog({ projectId: PROJECT_ID }),
		).rejects.toThrow("forbidden");
	});

	it("maps rows into entries with a detail and no cursor when exhausted", async () => {
		selectResult.rows = [row()];

		const result = await caller.getActivityLog({ projectId: PROJECT_ID });

		expect(result.entries).toEqual([
			expect.objectContaining({
				type: "reception.checkin",
				participantName: "Ana",
				detail: "Dia 2026-01-01",
			}),
		]);
		expect(result.nextCursor).toBeNull();
	});

	it("returns a cursor when there is another page", async () => {
		selectResult.rows = [
			row({ id: "00000000-0000-4000-8000-000000000002" }),
			row({ id: "00000000-0000-4000-8000-000000000003" }),
		];

		const result = await caller.getActivityLog({
			projectId: PROJECT_ID,
			limit: 1,
		});

		expect(result.entries).toHaveLength(1);
		expect(result.nextCursor).toEqual({
			createdAt: row().createdAt,
			id: "00000000-0000-4000-8000-000000000002",
		});
	});
});
