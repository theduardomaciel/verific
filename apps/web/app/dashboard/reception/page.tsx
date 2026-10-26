import { Suspense } from "react";

import {
	dashboardProjectId,
	HydrateQueries,
	prefetch,
} from "@/lib/trpc/hydrate";

import { ReceptionSkeleton, ReceptionPage } from "./content";

// Os dados chegam com a página (o mesmo `input` da query do cliente)
async function Prefetched() {
	const projectId = await dashboardProjectId();
	const queries = projectId
		? [await prefetch("getReceptionSummary", { projectId })]
		: [];
	return (
		<HydrateQueries queries={queries}>
			<ReceptionPage />
		</HydrateQueries>
	);
}

export default function Page() {
	return (
		<Suspense fallback={<ReceptionSkeleton />}>
			<Prefetched />
		</Suspense>
	);
}
