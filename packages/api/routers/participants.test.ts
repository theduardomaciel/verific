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
function selectChain(result: unknown) {
	const c = Object.assign(Promise.resolve(result), {
		from: () => c,
		leftJoin: () => c,
		where: () => c,
		orderBy: () => c,
		limit: () => c,
		offset: () => c,
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
