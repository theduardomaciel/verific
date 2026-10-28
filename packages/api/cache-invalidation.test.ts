import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import {
	mutationCacheRules,
	registerCacheRevalidator,
} from "./cache-invalidation";
import {
	PUBLIC_CACHEABLE_QUERY_PATHS,
	projectGamificationCacheTag,
} from "./cache-tags";
import { appRouter } from "./index";
import { createCallerFactory, createTRPCRouter, publicProcedure } from "./trpc";

/**
 * Guarda-corpo do registro de invalidação.
 *
 * A chave de `mutationCacheRules` é o caminho REAL do tRPC. Como
 * `appRouter` é um `mergeRouters` de routers planos, o caminho é
 * `updateActivity` — nunca `activities.updateActivity`. Um prefixo a mais
 * (ou um rename de procedure) não gera erro: a regra simplesmente nunca
 * casa e o cache fica velho. Estes testes tornam esse erro de digitação
 * uma falha de CI.
 */

type Procedures = Record<string, { _def: { type: string } }>;

const procedures = (
	appRouter as unknown as { _def: { procedures: Procedures } }
)._def.procedures;

describe("registro de invalidação", () => {
	it("toda regra aponta para uma mutation existente", () => {
		const orphans = Object.keys(mutationCacheRules).filter(
			(path) => procedures[path]?._def.type !== "mutation",
		);

		expect(orphans).toEqual([]);
	});

	it("todo caminho do cache de borda é uma query existente", () => {
		const orphans = [...PUBLIC_CACHEABLE_QUERY_PATHS].filter(
			(path) => procedures[path]?._def.type !== "query",
		);

		expect(orphans).toEqual([]);
	});

	it("dispara as tags da regra depois de uma mutation bem-sucedida", async () => {
		const seen: string[] = [];
		registerCacheRevalidator((tag) => seen.push(tag));

		mutationCacheRules.__test_ok = { tags: () => ["tag-ok"] };

		const caller = createCallerFactory(
			createTRPCRouter({
				__test_ok: publicProcedure.mutation(() => "ok"),
			}),
		)({ session: null });

		await expect(caller.__test_ok()).resolves.toBe("ok");
		expect(seen).toEqual(["tag-ok"]);

		delete mutationCacheRules.__test_ok;
	});

	it("não invalida nada quando a mutation falha", async () => {
		const seen: string[] = [];
		registerCacheRevalidator((tag) => seen.push(tag));

		mutationCacheRules.__test_fail = { tags: () => ["tag-fail"] };

		const caller = createCallerFactory(
			createTRPCRouter({
				__test_fail: publicProcedure.mutation(() => {
					throw new TRPCError({ code: "BAD_REQUEST" });
				}),
			}),
		)({ session: null });

		await expect(caller.__test_fail()).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		expect(seen).toEqual([]);

		delete mutationCacheRules.__test_fail;
	});
});

describe("updateProject", () => {
	it("invalida a URL gravada, não a digitada", () => {
		const tags = mutationCacheRules.updateProject!.tags({
			input: { id: "p1", url: "Meu_Evento" },
			result: { updated: true, url: "meu-evento" },
			snapshot: { previousUrl: "antigo" },
			ctx: { session: null },
		});

		expect(tags).toContain("project-url:meu-evento");
		expect(tags).not.toContain("project-url:Meu_Evento");
		expect(tags).toContain("projects");
	});

	it("só derruba a lista pública quando a URL muda", () => {
		const tags = mutationCacheRules.updateProject!.tags({
			input: { id: "p1", name: "Outro nome" },
			result: { updated: true, url: "evento" },
			snapshot: { previousUrl: "evento" },
			ctx: { session: null },
		});

		expect(tags).not.toContain("projects");
		expect(tags).toContain("project:p1");
	});
});

describe("addActivityParticipants", () => {
	const rule = mutationCacheRules.addActivityParticipants!;
	const input = { activityId: "a1", participantsIdsToAdd: ["p1"] };

	it("sem respostas, não lê o banco e usa o evento do resultado", async () => {
		await expect(rule.snapshot!(input, { session: null })).resolves.toBe(
			undefined,
		);
		expect(
			rule.tags({
				input,
				result: {
					success: true,
					projectId: "e1",
					gamificationChanged: true,
				},
				ctx: { session: null },
				snapshot: undefined,
			}),
		).toEqual([projectGamificationCacheTag("e1")]);
	});

	it("sem pontos, não invalida a gamificação", () => {
		expect(
			rule
				.tags({
					input,
					result: {
						success: true,
						projectId: "e1",
						gamificationChanged: false,
					},
					ctx: { session: null },
					snapshot: undefined,
				})
				.filter(Boolean),
		).toEqual([]);
	});
});
