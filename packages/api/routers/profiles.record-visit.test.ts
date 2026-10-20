import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const VIEWED_ID = "33333333-3333-4333-8333-333333333333";
const VIEWER_ID = "44444444-4444-4444-8444-444444444444";

const { db, findProject, findParticipant, insert, insertValues } = vi.hoisted(
	() => {
		const findProject = vi.fn();
		const findParticipant = vi.fn();
		const onConflictDoNothing = vi.fn(async () => undefined);
		const insertValues = vi.fn(() => ({ onConflictDoNothing }));
		const insert = vi.fn(() => ({ values: insertValues }));
		return {
			findProject,
			findParticipant,
			insert,
			insertValues,
			db: {
				query: {
					project: { findFirst: findProject },
					participant: { findFirst: findParticipant },
				},
				insert,
			},
		};
	},
);

vi.mock("@verific/drizzle", () => ({ db }));

import { createCallerFactory } from "../trpc";
import { profilesRouter } from "./profiles";

const createCaller = createCallerFactory(profilesRouter);
const session = { user: { id: USER_ID } } as unknown as Session;

function projectRow(overrides: Record<string, unknown> = {}) {
	const now = Date.now();
	return {
		id: PROJECT_ID,
		profilesEnabled: true,
		profileLayout: { connectionsEnabled: true },
		startDate: new Date(now - 60 * 60 * 1000),
		endDate: new Date(now + 60 * 60 * 1000),
		...overrides,
	};
}

describe("recordProfileVisit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		findProject.mockResolvedValue(projectRow());
	});

	it("does nothing when the event window is closed", async () => {
		const now = Date.now();
		findProject.mockResolvedValue(
			projectRow({
				startDate: new Date(now - 2 * 60 * 60 * 1000),
				endDate: new Date(now - 60 * 60 * 1000),
			}),
		);

		const result = await createCaller({ session }).recordProfileVisit({
			projectId: PROJECT_ID,
			shortId: "abc123",
		});

		expect(result).toEqual({ recorded: false });
		expect(findProject).toHaveBeenCalledTimes(1);
		expect(findParticipant).not.toHaveBeenCalled();
		expect(insert).not.toHaveBeenCalled();
	});

	it("does not query the project when there is no session", async () => {
		const result = await createCaller({
			session: null,
		}).recordProfileVisit({
			projectId: PROJECT_ID,
			shortId: "abc123",
		});

		expect(result).toEqual({ recorded: false });
		expect(findProject).not.toHaveBeenCalled();
		expect(findParticipant).not.toHaveBeenCalled();
		expect(insert).not.toHaveBeenCalled();
	});

	it("records a visit when the session and window are valid", async () => {
		findParticipant
			.mockResolvedValueOnce({ id: VIEWED_ID })
			.mockResolvedValueOnce({ id: VIEWER_ID });

		const result = await createCaller({ session }).recordProfileVisit({
			projectId: PROJECT_ID,
			shortId: "abc123",
		});

		expect(result).toEqual({ recorded: true });
		expect(findProject).toHaveBeenCalledTimes(1);
		expect(insert).toHaveBeenCalledTimes(1);
		expect(insertValues).toHaveBeenCalledWith({
			viewerParticipantId: VIEWER_ID,
			viewedParticipantId: VIEWED_ID,
			projectId: PROJECT_ID,
		});
	});

	it("keeps duplicate visits idempotent at the database", async () => {
		findParticipant
			.mockResolvedValueOnce({ id: VIEWED_ID })
			.mockResolvedValueOnce({ id: VIEWER_ID })
			.mockResolvedValueOnce({ id: VIEWED_ID })
			.mockResolvedValueOnce({ id: VIEWER_ID });

		const caller = createCaller({ session });
		const input = { projectId: PROJECT_ID, shortId: "abc123" };

		await expect(caller.recordProfileVisit(input)).resolves.toEqual({
			recorded: true,
		});
		await expect(caller.recordProfileVisit(input)).resolves.toEqual({
			recorded: true,
		});

		expect(insert).toHaveBeenCalledTimes(2);
		expect(insertValues).toHaveBeenCalledTimes(2);
	});

	it("ignores self-visits", async () => {
		findParticipant
			.mockResolvedValueOnce({ id: VIEWER_ID })
			.mockResolvedValueOnce({ id: VIEWER_ID });

		const result = await createCaller({ session }).recordProfileVisit({
			projectId: PROJECT_ID,
			shortId: "abc123",
		});

		expect(result).toEqual({ recorded: false });
		expect(insert).not.toHaveBeenCalled();
	});
});
