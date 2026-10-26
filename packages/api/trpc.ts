import { initTRPC, TRPCError } from "@trpc/server";
import SuperJSON from "superjson";

import type { Session } from "@verific/auth";
import { isQueryError } from "@verific/drizzle/redact";
import { ZodError } from "@verific/zod";

import { invalidateCacheTags, mutationCacheRules } from "./cache-invalidation";

type TRPCContext = {
	session: Session | null;
};

const t = initTRPC.context<TRPCContext>().create({
	transformer: SuperJSON,
	errorFormatter({ shape, error }) {
		// O erro de uma query traz o SQL e os parâmetros: não vai para o
		// cliente, e o log do servidor mantém o detalhe
		return {
			...shape,
			message: isQueryError(error.cause)
				? "Erro interno do servidor."
				: shape.message,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError
						? error.cause.flatten()
						: null,
				// Motivo legível por máquina (`{ code: "FORM_REQUIRED" }`
				// no `cause` do throw): o `cause` não atravessa o fio,
				// então só o código viaja — aditivo, nada existente muda.
				reason:
					typeof error.cause === "object" &&
					error.cause !== null &&
					"code" in error.cause &&
					typeof error.cause.code === "string"
						? error.cause.code
						: null,
			},
		};
	},
});

export const mergeRouters = t.mergeRouters;

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

/**
 * Invalidação on-demand do cache público.
 *
 * Aplica o registro declarativo de `cache-invalidation.ts` a TODAS as
 * mutations: antes de executar, tira o snapshot pedido pela regra (linhas
 * antigas que o handler pode sobrescrever/apagar); depois do sucesso,
 * dispara `revalidateTag(tag, "max")` para cada tag da regra. Queries e
 * procedures sem regra saem pelo caminho rápido — fora de mutations
 * relevantes o custo é um lookup de objeto.
 *
 * Nunca interfere na mutation: erro no snapshot vira `undefined` e a
 * invalidação é no-op em contextos sem cache (vitest/CLI), via
 * `invalidateCacheTags`.
 */
const cacheInvalidationMiddleware = t.middleware(async (opts) => {
	if (opts.type !== "mutation") return opts.next();

	const rule = mutationCacheRules[opts.path];
	if (!rule) return opts.next();

	// `opts.input` chega desserializado pelo transformer e ainda não
	// validado (o parser do `.input()` roda depois deste middleware) —
	// exatamente o que as regras esperam: leitura defensiva dos campos.
	const input = opts.input ?? (await opts.getRawInput());

	let snapshot: unknown;
	if (rule.snapshot) {
		try {
			snapshot = await rule.snapshot(input, opts.ctx);
		} catch {
			snapshot = undefined;
		}
	}

	const result = await opts.next();

	if (result.ok) {
		invalidateCacheTags(
			rule.tags({
				input,
				result: result.data,
				ctx: opts.ctx,
				snapshot,
			}),
		);
	}

	return result;
});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure.use(cacheInvalidationMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
	// Antes do snapshot de cache: chamada anônima não chega ao banco
	.use(({ ctx, next }) => {
		if (!ctx.session || !ctx.session.user) {
			throw new TRPCError({ code: "UNAUTHORIZED" });
		}

		return next({
			ctx: {
				// infers the session as non-null
				session: { ...ctx.session, user: ctx.session.user },
			},
		});
	})
	.use(cacheInvalidationMiddleware);
