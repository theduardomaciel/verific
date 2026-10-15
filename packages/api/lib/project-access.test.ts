import { describe, expect, it, vi } from "vitest";

const { findProject } = vi.hoisted(() => ({
	findProject: vi.fn(),
}));

vi.mock("@verific/drizzle", () => ({
	db: { query: { project: { findFirst: findProject } } },
}));

import { requireProjectAccess, requireProjectOwner } from "./project-access";

const OWNER_ID = "owner";
const MODERATOR_ID = "moderator";
const STRANGER_ID = "stranger";

function projectRow() {
	return {
		id: "project-1",
		ownerId: OWNER_ID,
		moderators: [{ userId: MODERATOR_ID }],
	};
}

describe("requireProjectAccess", () => {
	it("lets the owner through", async () => {
		findProject.mockResolvedValue(projectRow());

		await expect(
			requireProjectAccess("project-1", OWNER_ID),
		).resolves.toMatchObject({ ownerId: OWNER_ID });
	});

	it("lets moderators through", async () => {
		findProject.mockResolvedValue(projectRow());

		await expect(
			requireProjectAccess("project-1", MODERATOR_ID),
		).resolves.toMatchObject({ ownerId: OWNER_ID });
	});

	it("rejects non-members with FORBIDDEN", async () => {
		findProject.mockResolvedValue(projectRow());

		await expect(
			requireProjectAccess("project-1", STRANGER_ID),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("rejects unknown events with NOT_FOUND", async () => {
		findProject.mockResolvedValue(null);

		await expect(
			requireProjectAccess("missing", STRANGER_ID),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});

describe("requireProjectOwner", () => {
	it("lets the owner through", async () => {
		findProject.mockResolvedValue(projectRow());

		await expect(
			requireProjectOwner("project-1", OWNER_ID),
		).resolves.toMatchObject({ ownerId: OWNER_ID });
	});

	it("rejects moderators with FORBIDDEN", async () => {
		findProject.mockResolvedValue(projectRow());

		await expect(
			requireProjectOwner("project-1", MODERATOR_ID),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("rejects non-members with FORBIDDEN", async () => {
		findProject.mockResolvedValue(projectRow());

		await expect(
			requireProjectOwner("project-1", STRANGER_ID),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("rejects unknown events with NOT_FOUND", async () => {
		findProject.mockResolvedValue(null);

		await expect(
			requireProjectOwner("missing", STRANGER_ID),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});
