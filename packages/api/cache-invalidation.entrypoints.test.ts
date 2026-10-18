import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

import {
	__unregisterCacheRevalidator,
	invalidateAuthUserChange,
	invalidateCacheTags,
	registerCacheRevalidator,
} from "./cache-invalidation";
import { appRouter } from "./index";
import { createCallerFactory, createTRPCRouter, publicProcedure } from "./trpc";

/**
 * Invalidação por PONTO DE ENTRADA.
 *
 * O cache público não é derrubado num único lugar: além do handler HTTP do
 * tRPC (middleware em `trpc.ts`), as rotas do better-auth mutam `user`, e o
 * caller de servidor pode rodar mutations fora do handler. Cada ponto de
 * entrada precisa terminar nas mesmas tags; estes testes fixam o contrato
 * de cada um (e o aviso alto quando nenhum revalidator existe).
 */

const { activityFindFirst, dbUpdate } = vi.hoisted(() => ({
	activityFindFirst: vi.fn(async () => ({ projectId: "project-1" })),
	dbUpdate: vi.fn(() => ({
		set: () => ({ where: async () => [] }),
	})),
}));

vi.mock("@verific/drizzle", () => ({
	db: {
		update: dbUpdate,
		query: {
			activity: { findFirst: activityFindFirst },
		},
	},
}));
vi.mock("@verific/env", () => ({ env: {} }));

const createCaller = createCallerFactory(appRouter);

function collectingRevalidator() {
	const seen: string[] = [];
	registerCacheRevalidator((tag) => seen.push(tag));
	return seen;
}

describe("invalidação por ponto de entrada", () => {
	afterEach(() => {
		vi.clearAllMocks();
		__unregisterCacheRevalidator();
	});

	it("roteia uma mutation real do tRPC (updateUser) para events+profiles", async () => {
		const seen = collectingRevalidator();

		const caller = createCaller({
			session: { user: { id: "user-1" } } as unknown as Session,
		});

		await expect(caller.updateUser({ name: "Novo Nome" })).resolves.toEqual(
			{ success: true },
		);

		expect(seen).toEqual(["events", "profiles"]);
	});

	it("aplica a regra de escopo de atividade (snapshot → tags finas)", async () => {
		const seen = collectingRevalidator();
		activityFindFirst.mockResolvedValue({ projectId: "project-1" });

		// Path idêntico ao real (`updateActivity` é procedimento plano do
		// mergeRouters): a regra real e o middleware real são exercitados;
		// só o corpo da mutation é mínimo. A existência do path real é
		// garantida por `cache-invalidation.test.ts`.
		const router = createTRPCRouter({
			updateActivity: publicProcedure
				.input((input) => input as { activityId: string })
				.mutation(() => ({ updated: true })),
		});
		const caller = createCallerFactory(router)({ session: null });

		await caller.updateActivity({ activityId: "activity-1" });

		expect(activityFindFirst).toHaveBeenCalledTimes(1);
		expect(seen).toEqual([
			"activity:activity-1",
			"project-activities:project-1",
		]);
	});

	it("mapeia a mutação de usuário do better-auth para events+profiles", () => {
		const seen = collectingRevalidator();

		invalidateAuthUserChange();

		expect(seen).toEqual(["events", "profiles"]);
	});

	it("não invalida nada para mutation sem regra", async () => {
		const seen = collectingRevalidator();

		const router = createTRPCRouter({
			saveLayout: publicProcedure.mutation(() => "ok"),
		});
		const caller = createCallerFactory(router)({ session: null });

		await caller.saveLayout();

		expect(seen).toEqual([]);
	});
});

describe("nenhum no-op silencioso", () => {
	const originalStrict = process.env.CACHE_INVALIDATION_STRICT;

	beforeEach(() => {
		__unregisterCacheRevalidator();
		delete process.env.CACHE_INVALIDATION_STRICT;
	});

	afterEach(() => {
		if (originalStrict === undefined) {
			delete process.env.CACHE_INVALIDATION_STRICT;
		} else {
			process.env.CACHE_INVALIDATION_STRICT = originalStrict;
		}
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it("lança com CACHE_INVALIDATION_STRICT=1 e nenhum revalidator", () => {
		process.env.CACHE_INVALIDATION_STRICT = "1";

		expect(() => invalidateCacheTags(["projects"])).toThrow(
			/sem revalidator registrado/,
		);
	});

	it("é silencioso em produção", () => {
		vi.stubEnv("NODE_ENV", "production");
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		invalidateCacheTags(["projects"]);

		expect(error).not.toHaveBeenCalled();
	});

	it("avisa (console.error) em desenvolvimento e uma única vez", () => {
		vi.stubEnv("NODE_ENV", "development");
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		invalidateCacheTags(["projects"]);
		invalidateCacheTags(["events"]);

		expect(error).toHaveBeenCalledTimes(1);
		expect(error.mock.calls[0]?.[0]).toContain(
			"sem revalidator registrado",
		);
	});
});
