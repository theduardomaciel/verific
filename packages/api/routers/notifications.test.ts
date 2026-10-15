import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

const PROJECT_ID = randomUUID();
const ROW_ID = randomUUID();

const { findProject } = vi.hoisted(() => ({
	findProject: vi.fn(),
}));

vi.mock("@verific/drizzle", () => ({
	db: { query: { project: { findFirst: findProject } } },
}));
vi.mock("@verific/env", () => ({ env: {} }));

import { createCallerFactory } from "../trpc";
import { notificationsRouter } from "./notifications";

const createCaller = createCallerFactory(notificationsRouter);

const session = { user: { id: "user-1" } } as unknown as Session;

const inputs = {
	listNotifications: {
		projectId: PROJECT_ID,
		filter: "attention" as const,
		limit: 20,
	},
	statsNotifications: { projectId: PROJECT_ID },
	reprocessOneNotification: { projectId: PROJECT_ID, id: ROW_ID },
	reprocessBatchNotifications: {
		projectId: PROJECT_ID,
		filter: "attention" as const,
		limit: 20,
	},
};

describe("notificationsRouter authorization", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	for (const [name, input] of Object.entries(inputs)) {
		it(`rejects anonymous callers on ${name}`, async () => {
			const caller = createCaller({ session: null });
			const procedure = caller[name as keyof typeof caller] as (
				args: unknown,
			) => Promise<unknown>;

			await expect(procedure(input)).rejects.toMatchObject({
				code: "UNAUTHORIZED",
			});
			expect(findProject).not.toHaveBeenCalled();
		});
	}

	for (const [name, input] of Object.entries(inputs)) {
		it(`rejects unknown events on ${name}`, async () => {
			findProject.mockResolvedValue(null);
			const caller = createCaller({ session });
			const procedure = caller[name as keyof typeof caller] as (
				args: unknown,
			) => Promise<unknown>;

			await expect(procedure(input)).rejects.toMatchObject({
				code: "NOT_FOUND",
			});
		});
	}

	for (const [name, input] of Object.entries(inputs)) {
		it(`rejects non-organizers on ${name}`, async () => {
			findProject.mockResolvedValue({
				id: PROJECT_ID,
				ownerId: "someone-else",
				moderators: [],
			});
			const caller = createCaller({ session });
			const procedure = caller[name as keyof typeof caller] as (
				args: unknown,
			) => Promise<unknown>;

			await expect(procedure(input)).rejects.toMatchObject({
				code: "FORBIDDEN",
			});
		});
	}

	it("lets organizers through to the listing (empty page)", async () => {
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			ownerId: "user-1",
			moderators: [],
		});
		// Listing itself needs the real db; this only asserts the access
		// check passes by reaching the store (which throws on the mock db).
		const caller = createCaller({ session });

		await expect(
			caller.listNotifications(inputs.listNotifications),
		).rejects.not.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.listNotifications(inputs.listNotifications),
		).rejects.not.toMatchObject({ code: "NOT_FOUND" });
	});
});
