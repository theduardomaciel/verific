import { Suspense } from "react";

import {
	dashboardProjectId,
	HydrateQueries,
	prefetch,
} from "@/lib/trpc/hydrate";

import {
	NotificationSettingsSkeleton,
	NotificationSettingsPage,
} from "./content";

// Os dados chegam com a página (o mesmo `input` da query do cliente)
async function Prefetched() {
	const projectId = await dashboardProjectId();
	const queries = projectId
		? [await prefetch("getNotificationSettings", { projectId })]
		: [];
	return (
		<HydrateQueries queries={queries}>
			<NotificationSettingsPage />
		</HydrateQueries>
	);
}

export default function Page() {
	return (
		<Suspense fallback={<NotificationSettingsSkeleton />}>
			<Prefetched />
		</Suspense>
	);
}
