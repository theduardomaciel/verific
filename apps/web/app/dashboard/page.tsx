import { Suspense } from "react";

import {
	dashboardProjectId,
	HydrateQueries,
	prefetch,
} from "@/lib/trpc/hydrate";

import { DashboardSkeleton, Overview } from "./overview";

// Os dados chegam com a página (o mesmo `input` da query do cliente)
async function Prefetched() {
	const projectId = await dashboardProjectId();
	const queries = projectId
		? await Promise.all([
				prefetch("getActivities", {
					projectId,
					sort: "asc",
					pageSize: 5,
				}),
				prefetch("getDashboardStats", { projectId }),
			])
		: [];
	return (
		<HydrateQueries queries={queries}>
			<Overview />
		</HydrateQueries>
	);
}

export default function Page() {
	return (
		<Suspense fallback={<DashboardSkeleton />}>
			<Prefetched />
		</Suspense>
	);
}
