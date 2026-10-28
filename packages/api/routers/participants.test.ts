import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

const PROJECT_ID = randomUUID();

const { findProject, selectMock } = vi.hoisted(() => ({
	findProject: vi.fn(),
	selectMock: vi.fn(),
}));

vi.mock("@verific/drizzle", () => ({
	db: {
		query: { project: { findFirst: findProject } },
		select: selectMock,
	},
}));
vi.mock("@verific/env", () => ({
	env: { NEXT_PUBLIC_VERCEL_URL: "https://example.com" },
}));

import { createCallerFactory } from "../trpc";
import { participantsRouter } from "./participants";

const createCaller = createCallerFactory(participantsRouter);

/** Stub for drizzle's select-chain: a real promise carrying chain methods. */
function selectChain(result: unknown, onOffset?: (n: number) => void) {
	const c = Object.assign(Promise.resolve(result), {
		from: () => c,
		leftJoin: () => c,
		innerJoin: () => c,
		where: () => c,
		orderBy: () => c,
		limit: () => c,
		offset: (n: number) => {
			onOffset?.(n);
			return c;
		},
		groupBy: () => c,
	});
	return c;
}

const intruder = { user: { id: "intruder" } } as unknown as Session;
const owner = { user: { id: "owner" } } as unknown as Session;

function foreignProject() {
	return { id: PROJECT_ID, ownerId: "owner", moderators: [] };
}

describe("getParticipants access control", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("rejects a logged-in non-member with FORBIDDEN", async () => {
		findProject.mockResolvedValue(foreignProject());
		const caller = createCaller({ session: intruder });

		await expect(
			caller.getParticipants({ projectId: PROJECT_ID }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("rejects unknown events with NOT_FOUND", async () => {
		findProject.mockResolvedValue(null);
		const caller = createCaller({ session: intruder });

		await expect(
			caller.getParticipants({ projectId: PROJECT_ID }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("still lists for the organizer", async () => {
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			ownerId: "owner",
			moderators: [],
		});
		selectMock
			.mockReturnValueOnce(selectChain([]))
			.mockReturnValueOnce(selectChain([{ amount: 0 }]))
			.mockReturnValueOnce(selectChain([]));
		const caller = createCaller({ session: owner });

		await expect(
			caller.getParticipants({ projectId: PROJECT_ID }),
		).resolves.toEqual({
			participants: [],
			pageCount: 0,
			amount: 0,
			emailDomains: [],
		});
	});
});

describe("searchCheckInCandidates", () => {
	const ACTIVITY_ID = randomUUID();
	const monitor = { user: { id: "monitor" } } as unknown as Session;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	/** Monta as respostas do select: [monitor?], lista, contagem. */
	function mockSearch(options: { monitorRow?: boolean } = {}) {
		const offsets: number[] = [];
		if (options.monitorRow !== undefined) {
			selectMock.mockReturnValueOnce(
				selectChain(options.monitorRow ? [{ participantId: "p" }] : []),
			);
		}
		selectMock
			.mockReturnValueOnce(
				selectChain(
					[{ id: "p1", shortId: "abc", user: { name: "Ana" } }],
					(n) => offsets.push(n),
				),
			)
			.mockReturnValueOnce(selectChain([{ amount: 21 }]));
		return offsets;
	}

	it("lets the event team search without returning e-mails", async () => {
		findProject.mockResolvedValue(foreignProject());
		const offsets = mockSearch();
		const caller = createCaller({ session: owner });

		await expect(
			caller.searchCheckInCandidates({
				projectId: PROJECT_ID,
				query: "an",
				page: 1,
			}),
		).resolves.toMatchObject({ amount: 21, pageCount: 2 });
		expect(offsets).toEqual([20]);
		const fields = selectMock.mock.calls[0]![0] as {
			user: Record<string, unknown>;
		};
		expect(fields.user).not.toHaveProperty("email");
	});

	it("lets a monitor of the activity search", async () => {
		findProject.mockResolvedValue(foreignProject());
		mockSearch({ monitorRow: true });
		const caller = createCaller({ session: monitor });

		await expect(
			caller.searchCheckInCandidates({
				projectId: PROJECT_ID,
				activityId: ACTIVITY_ID,
			}),
		).resolves.toMatchObject({ amount: 21 });
	});

	it("rejects someone who does not monitor the activity", async () => {
		findProject.mockResolvedValue(foreignProject());
		selectMock.mockReturnValueOnce(selectChain([]));
		const caller = createCaller({ session: intruder });

		await expect(
			caller.searchCheckInCandidates({
				projectId: PROJECT_ID,
				activityId: ACTIVITY_ID,
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("rejects a monitor when no activity is given", async () => {
		findProject.mockResolvedValue(foreignProject());
		const caller = createCaller({ session: monitor });

		await expect(
			caller.searchCheckInCandidates({ projectId: PROJECT_ID }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(selectMock).not.toHaveBeenCalled();
	});

	it("rejects a team member without the reception permission", async () => {
		findProject.mockResolvedValue({
			...foreignProject(),
			moderators: [
				{
					userId: "member",
					role: "admin",
					permissions: ["event.manage"],
					includeInRanking: false,
				},
			],
		});
		const caller = createCaller({
			session: { user: { id: "member" } } as unknown as Session,
		});

		await expect(
			caller.searchCheckInCandidates({ projectId: PROJECT_ID }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});
