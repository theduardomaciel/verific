import { Suspense } from "react";

import {
	dashboardProjectId,
	HydrateQueries,
	prefetch,
} from "@/lib/trpc/hydrate";

import { GamificationSkeleton, GamificationSettingsPage } from "./content";

// Os dados chegam com a página (o mesmo `input` da query do cliente)
async function Prefetched() {
	const projectId = await dashboardProjectId();
	const queries = projectId
		? [await prefetch("getGamificationSettings", { projectId })]
		: [];
	return (
		<HydrateQueries queries={queries}>
			<GamificationSettingsPage />
		</HydrateQueries>
	);
}

export default function Page() {
	return (
		<Suspense fallback={<GamificationSkeleton />}>
			<Prefetched />
		</Suspense>
	);
}
