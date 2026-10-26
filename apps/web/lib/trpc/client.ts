import {
	createTRPCClient,
	httpBatchLink,
	splitLink,
	type TRPCLink,
} from "@trpc/client";
import SuperJSON from "superjson";

import type { AppRouter } from "@verific/api";

function getBaseUrl() {
	if (typeof window !== "undefined") return "";
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
	return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function getUrl() {
	return `${getBaseUrl()}/api/trpc`;
}

/**
 * `context: { fresh: true }` manda a query por POST: a resposta não passa
 * pelo cache de borda das queries públicas. Serve ao dashboard, que acabou
 * de salvar e precisa ler o próprio dado.
 */
export const trpcLinks: TRPCLink<AppRouter>[] = [
	splitLink({
		condition: (op) => op.context.fresh === true,
		true: httpBatchLink({
			url: getUrl(),
			transformer: SuperJSON,
			methodOverride: "POST",
		}),
		false: httpBatchLink({
			url: getUrl(),
			transformer: SuperJSON,
		}),
	}),
];

export const nativeClient = createTRPCClient<AppRouter>({
	links: trpcLinks,
});
