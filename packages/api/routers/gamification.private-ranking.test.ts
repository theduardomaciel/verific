import { describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";
import { parseGamificationConfig } from "@verific/drizzle/gamification";

const { findFirst, select } = vi.hoisted(() => ({
	findFirst: vi.fn(),
	select: vi.fn(),
}));

// Cadeia mínima de select: o teste do dono chega ao `loadRanking`.
function selectChain() {
	// O `where` serve às duas formas usadas por `loadRanking`: a contagem é
	// aguardada direto e a lista encadeia `orderBy().limit()`.
	const whereResult = Object.assign(Promise.resolve([{ amount: 0 }]), {
		orderBy: () => ({ limit: async () => [] }),
	});
	const chain = {
		from: () => chain,
		innerJoin: () => chain,
		where: () => whereResult,
	};
	return chain;
}

vi.mock("@verific/drizzle", () => ({
	db: {
		query: { project: { findFirst } },
		select,
	},
}));
vi.mock("@verific/env", () => ({ env: {} }));

import { appRouter } from "../index";
import { createCallerFactory } from "../trpc";

const createCaller = createCallerFactory(appRouter);

const PROJECT = {
	id: "11111111-1111-4111-8111-111111111111",
	ownerId: "owner-user",
	startDate: new Date("2026-10-20T00:00:00Z"),
	endDate: new Date("2026-10-25T00:00:00Z"),
	profilesEnabled: true,
	moderators: [{ userId: "moderator-user" }],
	gamification: parseGamificationConfig({
		enabled: true,
		ranking: {
			isPublic: false,
		},
	}),
};

const session = (userId: string) => ({
	session: { user: { id: userId } } as unknown as Session,
});

describe("getEventRanking com ranking privado", () => {
	it("esconde o ranking de visitante anônimo", async () => {
		findFirst.mockResolvedValue(PROJECT);
		const caller = createCaller({ session: null });

		await expect(
			caller.getEventRanking({ projectUrl: "evento" }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("esconde o ranking de quem não é dono nem moderador", async () => {
		findFirst.mockResolvedValue(PROJECT);
		const caller = createCaller(session("stranger"));

		await expect(
			caller.getEventRanking({ projectUrl: "evento" }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("liberar para o dono do evento", async () => {
		findFirst.mockResolvedValue(PROJECT);
		select.mockImplementation(selectChain);
		const caller = createCaller(session("owner-user"));

		await expect(
			caller.getEventRanking({ projectUrl: "evento" }),
		).resolves.toMatchObject({ rows: [], total: 0 });
	});

	it("liberar para moderador do evento", async () => {
		findFirst.mockResolvedValue(PROJECT);
		select.mockImplementation(selectChain);
		const caller = createCaller(session("moderator-user"));

		await expect(
			caller.getEventRanking({ projectUrl: "evento" }),
		).resolves.toMatchObject({ rows: [], total: 0 });
	});
});
