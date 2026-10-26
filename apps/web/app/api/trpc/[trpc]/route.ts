import { type NextRequest } from "next/server";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getSessionCookie } from "better-auth/cookies";

import { appRouter, PUBLIC_CACHEABLE_QUERY_PATHS } from "@verific/api";

import { getRefreshingSession } from "@/lib/session";
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
 *
 * O `Cache-Control` do NAVEGADOR é separado (`max-age=0`): sem ele o
 * Chromium aplica cache heurístico e devolve a resposta anterior por até
 * 1h (vagas e dashboard desatualizados). A borda lê os cabeçalhos
 * `CDN-Cache-Control`/`Vercel-CDN-Cache-Control`, que continuam com a
 * janela longa.
 */
const PUBLIC_QUERY_CDN_CACHE_CONTROL =
	"public, s-maxage=60, stale-while-revalidate=3600";
const PUBLIC_QUERY_BROWSER_CACHE_CONTROL = "public, max-age=0, must-revalidate";
const PRIVATE_QUERY_CACHE_CONTROL = "private, no-store";

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

/**
 * Caminhos do batch, lidos da URL antes de executar.
 *
 * O `httpBatchLink` põe todos os procedimentos no path
 * (`/api/trpc/getProject,getAllProjects?batch=1`), inclusive nos POSTs.
 * Isso permite decidir no `createContext` se a sessão será necessária —
 * sem esperar a execução. Qualquer batch misto (ou path desconhecido)
 * mantém a checagem de sessão normal.
 */
function batchIsPublicQuery(req: NextRequest): boolean {
	if (req.method !== "GET") return false;

	const raw = decodeURIComponent(
		req.nextUrl.pathname.replace(/^\/api\/trpc\/?/, ""),
	);
	if (!raw) return false;

	return raw
		.split(",")
		.every((path) => PUBLIC_CACHEABLE_QUERY_PATHS.has(path));
}

const handler = async (req: NextRequest) => {
	// Com um `%` inválido no path, o tRPC lançaria URIError e responderia 500
	try {
		decodeURIComponent(req.nextUrl.pathname);
	} catch {
		return new Response(null, { status: 404 });
	}

	// Um GET 100% público não depende de sessão (há teste de execução em
	// `packages/api/public-cacheable-queries.test.ts`). Pular a leitura do
	// cookie cache/DB aqui é seguro e barato: login não muda a resposta.
	const publicQueryRequest = batchIsPublicQuery(req);

	const response = await fetchRequestHandler({
		endpoint: "/api/trpc",
		router: appRouter,
		req,
		// Queries com `context.fresh` chegam por POST (ver `lib/trpc/client`)
		allowMethodOverride: true,
		createContext: async () => {
			// Sessão preguiçosa: sem cookie de sessão não há o que buscar no
			// banco — a maioria dos acessos públicos nem traz cookie.
			// `getRefreshingSession()` só roda com candidato.
			if (publicQueryRequest || !getSessionCookie(req)) {
				return { session: null };
			}

			return {
				session: await getRefreshingSession(),
			};
		},
		responseMeta: ({ errors, info }) => {
			// Mutations (incluindo `recordProfileVisit`) nunca podem ser
			// cacheadas: a resposta depende da sessão e/ou altera dados.
			if (req.method !== "GET") {
				return {
					headers: {
						"Cache-Control": PRIVATE_QUERY_CACHE_CONTROL,
					},
				};
			}
			// Só GET de query bem-sucedida e 100% de caminhos públicos: nada
			// de cachear erro ou batch misto com dado de sessão.
			if (errors.length > 0) {
				return {
					headers: {
						"Cache-Control": PRIVATE_QUERY_CACHE_CONTROL,
					},
				};
			}
			if (!isPublicCacheableQuery(info)) {
				// Queries de sessão (ex.: `getActivity` com e-mail de
				// inscritos) também não podem ficar no cache do navegador.
				return {
					headers: {
						"Cache-Control": PRIVATE_QUERY_CACHE_CONTROL,
					},
				};
			}

			return {
				headers: {
					"Cache-Control": PUBLIC_QUERY_BROWSER_CACHE_CONTROL,
					"CDN-Cache-Control": PUBLIC_QUERY_CDN_CACHE_CONTROL,
					"Vercel-CDN-Cache-Control": PUBLIC_QUERY_CDN_CACHE_CONTROL,
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

export { handler as GET, handler as POST };
