import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PUBLIC_CACHEABLE_QUERY_PATHS } from "./cache-tags";
import { appRouter } from "./index";
import { createCallerFactory, createTRPCRouter, publicProcedure } from "./trpc";

/**
 * Prova, por EXECUÇÃO, que nenhum procedimento do cache de borda depende de
 * `ctx.session`.
 *
 * O `Cache-Control` público de `PUBLIC_CACHEABLE_QUERY_PATHS` só é seguro se
 * o corpo do procedimento ignorar a sessão: uma leitura de `ctx.session`
 * faria a borda servir a resposta de um usuário para todos. A checagem é um
 * `Proxy` de contexto que grava **qualquer** leitura de propriedade — se o
 * procedimento tocar em `ctx.session`, a lista deixa de ser vazia.
 */

const { dbQuery, dbSelect } = vi.hoisted(() => ({
	dbQuery: {
		project: { findFirst: vi.fn(), findMany: vi.fn() },
		tag: { findMany: vi.fn() },
		formVersion: { findFirst: vi.fn() },
		formField: { findMany: vi.fn() },
		formSection: { findMany: vi.fn() },
		participant: { findFirst: vi.fn() },
		formAnswer: { findMany: vi.fn() },
		profileFieldVisibility: { findMany: vi.fn() },
		profileConnection: { findMany: vi.fn() },
	},
	dbSelect: vi.fn(() => ({
		from: () => ({ where: async () => [{ n: 0 }] }),
	})),
}));

vi.mock("@verific/drizzle", () => ({
	db: { query: dbQuery, select: dbSelect },
}));
vi.mock("@verific/env", () => ({ env: {} }));

const createCaller = createCallerFactory(appRouter);
const PROJECT_UUID = randomUUID();

const PROJECT = {
	id: PROJECT_UUID,
	url: "event-1",
	profilesEnabled: true,
	profileLayout: null,
};

beforeEach(() => {
	vi.clearAllMocks();
	dbQuery.project.findFirst.mockResolvedValue(PROJECT);
	dbQuery.project.findMany.mockResolvedValue([
		{ id: PROJECT_UUID, url: "event-1" },
	]);
	dbQuery.tag.findMany.mockResolvedValue([]);
	dbQuery.formVersion.findFirst.mockResolvedValue(null);
	dbQuery.formField.findMany.mockResolvedValue([]);
	dbQuery.formSection.findMany.mockResolvedValue([]);
	dbQuery.participant.findFirst.mockResolvedValue({
		id: "participant-1",
		shortId: "abc123",
		user: { name: "Alguém", image_url: null },
	});
	dbQuery.formAnswer.findMany.mockResolvedValue([]);
	dbQuery.profileFieldVisibility.findMany.mockResolvedValue([]);
	dbQuery.profileConnection.findMany.mockResolvedValue([]);
});

/** Contexto que registra toda leitura de propriedade (`ctx.*`). */
function tripwireContext() {
	const accessed: string[] = [];
	const ctx = new Proxy({} as { session: unknown }, {
		get(_target, prop) {
			accessed.push(String(prop));
			return undefined;
		},
	});
	return { ctx, accessed };
}

const INPUTS: Record<string, unknown> = {
	getAllProjects: undefined,
	getProject: { url: "event-1" },
	getProjectTags: { projectId: PROJECT_UUID },
	getPublishedForm: { projectId: PROJECT_UUID },
	getProfileLayout: { projectUrl: "event-1" },
	getProfilePageData: { projectUrl: "event-1", shortId: "abc123" },
};

describe("caminhos públicos cacheáveis não leem a sessão", () => {
	it("o tripwire detecta uma leitura de sessão (auto-teste)", async () => {
		const router = createTRPCRouter({
			__readsSession: publicProcedure.query(({ ctx }) => ctx.session),
		});
		const { ctx, accessed } = tripwireContext();
		const caller = createCallerFactory(router)(ctx as never);
		accessed.length = 0;

		await caller.__readsSession();

		expect(accessed).toContain("session");
	});

	for (const path of PUBLIC_CACHEABLE_QUERY_PATHS) {
		it(`${path} roda até o fim sem tocar em ctx`, async () => {
			const { ctx, accessed } = tripwireContext();
			const caller = createCaller(ctx as never);
			// Criação do caller/tRPC pode inspecionar o contexto; só o que a
			// execução do procedimento lê importa.
			accessed.length = 0;

			const invoke = (
				caller as unknown as Record<
					string,
					(input?: unknown) => Promise<unknown>
				>
			)[path];

			expect(typeof invoke).toBe("function");
			await expect(invoke?.(INPUTS[path])).resolves.toBeDefined();
			expect(accessed).toEqual([]);
		});
	}
});
