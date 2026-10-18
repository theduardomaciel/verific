import {
	defaultShouldDehydrateQuery,
	QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

/**
 * Defaults de cache do cliente (React Query).
 *
 * O servidor já entrega dado fresco por cache de tag + `refresh()`
 * pós-mutation; então o cliente pode segurar as respostas por mais tempo:
 * menos refetch = menos invocações de função tRPC (cada refetch é um
 * request novo no handler HTTP).
 *
 * `retry: 1`: um único retry cobre blips de rede sem multiplicar
 * tentativas em erro determinístico (validação/autorização) — erros são
 * renderizados como dado (`isError`), nunca como exceção.
 */
export const createQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				// Errors are data: screens render them inline via the
				// `isError` field, never as thrown exceptions.
				throwOnError: false,
				retry: 1,
				// With SSR, we usually want to set some default staleTime
				// above 0 to avoid refetching immediately on the client.
				staleTime: 10 * 60 * 1000, // 10 min (aggressive)
				// Mantém dado inativo por mais tempo para navegação de ida
				// e volta não refazer queries já resolvidas.
				gcTime: 30 * 60 * 1000, // 30 min (aggressive)
				// Refetch em foco/reconexão refaz todo o quadro visível —
				// depois de um blip de backend vira tempestade de erros e
				// de invocações; refazer explicitamente é mais barato.
				refetchOnWindowFocus: false,
				refetchOnReconnect: false,
			},
			dehydrate: {
				serializeData: SuperJSON.serialize,
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) ||
					query.state.status === "pending",
				shouldRedactErrors: () => {
					// We should not catch Next.js server errors
					// as that's how Next.js detects dynamic pages
					// so we cannot redact them.
					// Next.js also automatically redacts errors for us
					// with better digests.
					return false;
				},
			},
			hydrate: {
				deserializeData: SuperJSON.deserialize,
			},
		},
	});
