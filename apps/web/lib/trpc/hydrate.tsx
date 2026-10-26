import "server-only";
import { cookies } from "next/headers";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { createQueryClient } from "./query-client";
import { serverClient } from "./server";

type Client = typeof serverClient;
type QueryPath = {
	[K in keyof Client]: Client[K] extends (input: never) => Promise<unknown>
		? K
		: never;
}[keyof Client];

interface Prefetched {
	path: string;
	input: unknown;
	data: unknown;
}

/**
 * Entrega ao cliente queries tRPC já resolvidas no servidor: o
 * `trpc.<path>.useQuery(input)` da página começa com o dado, sem a cascata
 * servidor → cliente → servidor. A chave segue o formato do
 * `@trpc/react-query`, então o `input` precisa ser o mesmo do cliente.
 */
export function HydrateQueries({
	queries,
	children,
}: {
	queries: Array<Prefetched | null>;
	children: React.ReactNode;
}) {
	const client = createQueryClient();
	for (const query of queries) {
		if (!query) continue;
		client.setQueryData(
			[
				[query.path],
				{
					...(query.input === undefined
						? {}
						: { input: query.input }),
					type: "query",
				},
			],
			query.data,
		);
	}
	return (
		<HydrationBoundary state={dehydrate(client)}>
			{children}
		</HydrationBoundary>
	);
}

/** Roda a query no servidor; numa falha, o cliente busca e mostra o erro. */
export async function prefetch<P extends QueryPath>(
	path: P,
	input: Parameters<Client[P]>[0],
): Promise<Prefetched | null> {
	try {
		const call = serverClient[path] as (input: unknown) => Promise<unknown>;
		return { path, input, data: await call(input) };
	} catch {
		return null;
	}
}

/** Evento aberto no dashboard (o mesmo cookie que o layout lê). */
export async function dashboardProjectId() {
	return (await cookies()).get("projectId")?.value;
}
