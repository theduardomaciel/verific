import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = randomUUID();

const { findProject, findParticipant, selectMock } = vi.hoisted(() => ({
	findProject: vi.fn(),
	findParticipant: vi.fn(),
	selectMock: vi.fn(),
}));

vi.mock("@verific/drizzle", () => ({
	db: {
		query: {
			project: { findFirst: findProject },
			participant: { findFirst: findParticipant },
		},
		select: selectMock,
	},
}));
vi.mock("@verific/env", () => ({ env: {} }));

import { createCallerFactory } from "../trpc";
import { profilesRouter } from "./profiles";

const caller = createCallerFactory(profilesRouter)({ session: null });

/** Cadeia do select de conexões; registra o `limit` pedido. */
function selectRows(rows: unknown[]) {
	const limits: number[] = [];
	const chain = {
		from: () => chain,
		innerJoin: () => chain,
		where: () => chain,
		orderBy: () => chain,
		limit: async (n: number) => {
			limits.push(n);
			return rows;
		},
	};
	selectMock.mockReturnValueOnce(chain);
	return limits;
}

function row(i: number) {
	return {
		participantId: randomUUID(),
		createdAt: new Date(2026, 9, 29, 12, 0, 60 - i),
		name: ` Pessoa ${i} `,
		avatarUrl: null,
	};
}

const input = { projectUrl: "evento", shortId: "dono" };

beforeEach(() => {
	vi.clearAllMocks();
	findProject.mockResolvedValue({
		id: PROJECT_ID,
		profilesEnabled: true,
		profileLayout: null,
	});
	findParticipant.mockResolvedValue({ id: randomUUID() });
});

describe("getProfileConnections", () => {
	it("pages the connections with a cursor and no contact data", async () => {
		const rows = [row(1), row(2), row(3)];
		const limits = selectRows(rows);

		const page = await caller.getProfileConnections({ ...input, limit: 2 });

		expect(limits).toEqual([3]);
		expect(page.connections).toEqual([
			{ name: "Pessoa 1", avatarUrl: null },
			{ name: "Pessoa 2", avatarUrl: null },
		]);
		expect(page.nextCursor).toEqual({
			createdAt: rows[1]!.createdAt,
			participantId: rows[1]!.participantId,
		});
	});

	it("ends the pages when nothing is left", async () => {
		selectRows([row(1)]);

		const page = await caller.getProfileConnections({ ...input, limit: 2 });

		expect(page.nextCursor).toBeNull();
	});

	it.each([
		["profiles are off", { profilesEnabled: false, profileLayout: null }],
		[
			"connections are off",
			{
				profilesEnabled: true,
				profileLayout: { connectionsEnabled: false },
			},
		],
	])("hides the list when %s", async (_case, projectRow) => {
		findProject.mockResolvedValue({ id: PROJECT_ID, ...projectRow });

		await expect(caller.getProfileConnections(input)).rejects.toMatchObject(
			{ code: "NOT_FOUND" },
		);
		expect(selectMock).not.toHaveBeenCalled();
	});

	it("hides the list of an unknown profile", async () => {
		findParticipant.mockResolvedValue(undefined);

		await expect(caller.getProfileConnections(input)).rejects.toMatchObject(
			{ code: "NOT_FOUND" },
		);
	});
});
