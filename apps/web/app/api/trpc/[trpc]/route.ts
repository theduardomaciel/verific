import { type NextRequest } from "next/server";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getSessionCookie } from "better-auth/cookies";

import { appRouter, PUBLIC_CACHEABLE_QUERY_PATHS } from "@verific/api";

import { getSession } from "@/lib/session";
// Boot da invalidação pública (registra `revalidateTag` em `@verific/api`).
// Fica num módulo compartilhado, e não aqui, para que os outros runtimes
// que executam mutations (better-auth, caller de servidor) também o tenham.
import "@/lib/server-cache-invalidation";

const setCorsHeaders = (res: Response) => {
	res.headers.set("Access-Control-Allow-Origin", "*");
	res.headers.set("Access-Control-Request-Method", "*");
	res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
	res.headers.set("Access-Control-Allow-Headers", "*");
};

export const OPTIONS = () => {
	const response = new Response(null, {
		status: 204,
	});
	setCorsHeaders(response);
	return response;
};

/**
 * Cache de borda para queries públicas (lista em `PUBLIC_CACHEABLE_QUERY_PATHS`).
 *
 * O `s-maxage` é curto de propósito: o CDN não é purgado por
 * `revalidateTag` (que só derruba o Data Cache do Next), então esta janela
 * é o teto de defasagem após uma mutation; o `stale-while-revalidate`
 * longo cobre picos (a borda serve o valor antigo uma vez e regenera em
 * fundo) — exatamente o comportamento desejado numa enchente de acessos.
 */
const PUBLIC_QUERY_CACHE_CONTROL =
	"public, s-maxage=60, stale-while-revalidate=3600";

function isPublicCacheableQuery(
	info: { type: string; calls: readonly { path: string }[] } | undefined,
): boolean {
	if (!info || info.type !== "query" || info.calls.length === 0) {
		return false;
	}
	return info.calls.every((call) =>
		PUBLIC_CACHEABLE_QUERY_PATHS.has(call.path),
	);
}

const handler = async (req: NextRequest) => {
	const response = await fetchRequestHandler({
		endpoint: "/api/trpc",
		router: appRouter,
		req,
		createContext: async () => {
			// Sessão preguiçosa: sem cookie de sessão não há o que buscar no
			// banco — a maioria dos acessos públicos nem traz cookie.
			// `getSession()` (memoizado por request) só roda com candidato.
			if (!getSessionCookie(req)) {
				return { session: null };
			}

			return {
				session: await getSession(),
			};
		},
		responseMeta: ({ errors, info }) => {
			// Só GET de query bem-sucedida e 100% de caminhos públicos: nada
			// de cachear mutação, erro ou batch misto com dado de sessão.
			if (req.method !== "GET") return {};
			if (errors.length > 0) return {};
			if (!isPublicCacheableQuery(info)) return {};

			return {
				headers: {
					"Cache-Control": PUBLIC_QUERY_CACHE_CONTROL,
				},
			};
		},
		onError({ error, path }) {
			console.error(`>>> tRPC Error on '${path}'`, error);
		},
	});

	setCorsHeaders(response);
	return response;
};

// export const runtime = "edge";
// export const preferredRegion = "cle1";
export { handler as GET, handler as POST };
