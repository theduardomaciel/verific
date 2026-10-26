import "server-only";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { createQueryClient } from "./query-client";

/**
 * Entrega ao cliente uma query tRPC já resolvida no servidor: o
 * `trpc.<path>.useQuery(input)` da página começa com o dado, sem cascata.
 * A chave segue o formato do `@trpc/react-query`.
 */
export function HydrateQuery({
	path,
	input,
	data,
	children,
}: {
	path: string;
	input?: unknown;
	data: unknown;
	children: React.ReactNode;
}) {
	const client = createQueryClient();
	client.setQueryData(
		[[path], { ...(input === undefined ? {} : { input }), type: "query" }],
		data,
	);
	return (
		<HydrationBoundary state={dehydrate(client)}>
			{children}
		</HydrationBoundary>
	);
}
