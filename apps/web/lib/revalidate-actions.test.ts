import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	updateTagMock,
	getSessionMock,
	hasProjectAccessMock,
	hasProjectAccessByUrlMock,
	ownsParticipantProfileMock,
} = vi.hoisted(() => ({
	updateTagMock: vi.fn(),
	getSessionMock: vi.fn(),
	hasProjectAccessMock: vi.fn(),
	hasProjectAccessByUrlMock: vi.fn(),
	ownsParticipantProfileMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag: updateTagMock, refresh: vi.fn() }));
vi.mock("next/headers", () => ({
	cookies: vi.fn(),
	headers: async () => new Headers(),
}));
vi.mock("@verific/auth", () => ({ auth: { api: {} } }));
vi.mock("@verific/api", () => ({
	GLOBAL_CACHE_TAGS: { projects: "projects" },
	projectUrlCacheTag: (url: string) => `project-url:${url}`,
	participantProfileCacheTag: (id: string, shortId: string) =>
		`profile:${id}:${shortId}`,
	profileLayoutCacheTag: (id: string) => `profile-layout:${id}`,
	projectProfilesCacheTag: (id: string) => `profiles:${id}`,
}));
vi.mock("@/lib/session", () => ({ getSession: getSessionMock }));
vi.mock("@verific/api/project-access", () => ({
	hasProjectAccess: hasProjectAccessMock,
	hasProjectAccessByUrl: hasProjectAccessByUrlMock,
	ownsParticipantProfile: ownsParticipantProfileMock,
}));

import { revalidateProjects } from "@/app/actions";

import { revalidateEventProfiles, revalidateProfile } from "./profile-actions";
import { revalidateProjectTheme } from "./theme/actions";

const session = { user: { id: "user-1" } };

const actions = [
	["revalidateProjects", () => revalidateProjects("evento")],
	["revalidateProjectTheme", () => revalidateProjectTheme("evento")],
	["revalidateEventProfiles", () => revalidateEventProfiles("project-1")],
	["revalidateProfile", () => revalidateProfile("project-1", "abc123")],
] as const;

describe("actions que invalidam o cache", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		hasProjectAccessMock.mockResolvedValue(false);
		hasProjectAccessByUrlMock.mockResolvedValue(false);
		ownsParticipantProfileMock.mockResolvedValue(false);
	});

	it.each(actions)("%s não faz nada sem login", async (_name, run) => {
		getSessionMock.mockResolvedValue(null);

		await run();

		expect(updateTagMock).not.toHaveBeenCalled();
	});

	it.each(actions)("%s não faz nada sem acesso", async (_name, run) => {
		getSessionMock.mockResolvedValue(session);

		await run();

		expect(updateTagMock).not.toHaveBeenCalled();
	});

	it.each(actions)("%s invalida para a organização", async (_name, run) => {
		getSessionMock.mockResolvedValue(session);
		hasProjectAccessMock.mockResolvedValue(true);
		hasProjectAccessByUrlMock.mockResolvedValue(true);

		await run();

		expect(updateTagMock).toHaveBeenCalled();
	});

	it("revalidateProfile invalida para o dono do perfil", async () => {
		getSessionMock.mockResolvedValue(session);
		ownsParticipantProfileMock.mockResolvedValue(true);

		await expect(revalidateProfile("project-1", "abc123")).resolves.toEqual(
			{
				revalidated: true,
			},
		);
		expect(ownsParticipantProfileMock).toHaveBeenCalledWith(
			"project-1",
			"abc123",
			"user-1",
		);
	});
});
