import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

const PROJECT_ID = randomUUID();

const { findProject, findModerators, dbDelete, dbSelect } = vi.hoisted(() => ({
	findProject: vi.fn(),
	findModerators: vi.fn(async () => []),
	dbDelete: vi.fn(() => ({ where: async () => [] })),
	dbSelect: vi.fn(() => ({
		from: vi.fn(() => ({
			where: vi.fn(async () => []),
		})),
	})),
}));

vi.mock("@verific/drizzle", () => ({
	db: {
		query: {
			project: { findFirst: findProject },
			projectModerator: { findMany: findModerators },
		},
		delete: dbDelete,
		select: dbSelect,
		transaction: (fn: (tx: { delete: typeof dbDelete }) => unknown) =>
			fn({ delete: dbDelete }),
	},
}));
vi.mock("@verific/env", () => ({ env: {} }));

import { createCallerFactory } from "../trpc";
import { projectsRouter } from "./projects";

const createCaller = createCallerFactory(projectsRouter);

const intruder = { user: { id: "intruder" } } as unknown as Session;
const owner = { user: { id: "owner" } } as unknown as Session;

describe("deleteProject access control", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("rejects a logged-in non-member with FORBIDDEN and deletes nothing", async () => {
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			ownerId: "owner",
			moderators: [],
		});
		const caller = createCaller({ session: intruder });

		await expect(
			caller.deleteProject({ id: PROJECT_ID }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(dbDelete).not.toHaveBeenCalled();
	});

	it("rejects unknown events with NOT_FOUND", async () => {
		findProject.mockResolvedValue(null);
		const caller = createCaller({ session: intruder });

		await expect(
			caller.deleteProject({ id: PROJECT_ID }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(dbDelete).not.toHaveBeenCalled();
	});

	it("still lets the owner delete", async () => {
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			ownerId: "owner",
			moderators: [],
		});
		const caller = createCaller({ session: owner });

		await expect(caller.deleteProject({ id: PROJECT_ID })).resolves.toEqual(
			{ success: true },
		);
		// As atividades saem antes: activities.project_id é RESTRICT
		expect(dbDelete).toHaveBeenCalledTimes(2);
	});

	it("rejects moderators: deletion is owner-only", async () => {
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			ownerId: "owner",
			moderators: [{ userId: "moderator" }],
		});
		const caller = createCaller({
			session: { user: { id: "moderator" } } as unknown as Session,
		});

		await expect(
			caller.deleteProject({ id: PROJECT_ID }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(dbDelete).not.toHaveBeenCalled();
	});
});
