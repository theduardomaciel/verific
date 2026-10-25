import { describe, expect, it, vi } from "vitest";

const { findProject, findActivity, findParticipant, selectMock } = vi.hoisted(
	() => ({
		findProject: vi.fn(),
		findActivity: vi.fn(),
		findParticipant: vi.fn(),
		selectMock: vi.fn(),
	}),
);

vi.mock("@verific/drizzle", () => ({
	db: {
		query: {
			project: { findFirst: findProject },
			activity: { findFirst: findActivity },
			participant: { findFirst: findParticipant },
		},
		select: selectMock,
	},
}));

import {
	hasProjectAccess,
	ownsParticipantProfile,
	requireActivityAccess,
	requireParticipantsInProject,
	requireProjectAccess,
	requireProjectOwner,
} from "./project-access";

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

describe("requireActivityAccess", () => {
	it("checa o evento da atividade", async () => {
		findActivity.mockResolvedValue({ projectId: "project-1" });
		findProject.mockResolvedValue(projectRow());

		await expect(
			requireActivityAccess("activity-1", MODERATOR_ID),
		).resolves.toEqual({ projectId: "project-1" });
		await expect(
			requireActivityAccess("activity-1", STRANGER_ID),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("rejects unknown activities with NOT_FOUND", async () => {
		findActivity.mockResolvedValue(null);

		await expect(
			requireActivityAccess("missing", OWNER_ID),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});

describe("hasProjectAccess", () => {
	it("responde sem lançar", async () => {
		findProject.mockResolvedValue(projectRow());
		await expect(hasProjectAccess("project-1", OWNER_ID)).resolves.toBe(
			true,
		);
		await expect(hasProjectAccess("project-1", STRANGER_ID)).resolves.toBe(
			false,
		);

		findProject.mockResolvedValue(null);
		await expect(hasProjectAccess("missing", OWNER_ID)).resolves.toBe(
			false,
		);
	});
});

describe("ownsParticipantProfile", () => {
	it("é verdadeiro só quando o perfil é do usuário", async () => {
		findParticipant.mockResolvedValueOnce({ id: "p1" });
		await expect(
			ownsParticipantProfile("project-1", "abc", OWNER_ID),
		).resolves.toBe(true);

		findParticipant.mockResolvedValueOnce(undefined);
		await expect(
			ownsParticipantProfile("project-1", "abc", STRANGER_ID),
		).resolves.toBe(false);
	});
});

describe("requireParticipantsInProject", () => {
	function selectChain(result: unknown) {
		const c = Object.assign(Promise.resolve(result), {
			from: () => c,
			where: () => c,
		});
		return c;
	}

	it("aceita quando todos são do evento", async () => {
		selectMock.mockReturnValue(selectChain([{ id: "a" }, { id: "b" }]));

		await expect(
			requireParticipantsInProject("project-1", ["a", "b"]),
		).resolves.toBeUndefined();
	});

	it("recusa participante de outro evento", async () => {
		selectMock.mockReturnValue(selectChain([{ id: "a" }]));

		await expect(
			requireParticipantsInProject("project-1", ["a", "b"]),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});
