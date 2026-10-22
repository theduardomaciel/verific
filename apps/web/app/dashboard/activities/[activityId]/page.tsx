import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ActivityContent } from "./content";

export default function ActivityPage({
	params,
}: {
	params: Promise<{ activityId: string }>;
}) {
	return (
		<Suspense
			fallback={
				<main className="py-container-v container-p flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-start gap-9">
					<Skeleton className="h-64 w-full" />
				</main>
			}
		>
			<ActivityContentLoader params={params} />
		</Suspense>
	);
}

async function ActivityContentLoader({
	params,
}: {
	params: Promise<{ activityId: string }>;
}) {
	const { activityId } = await params;

	return <ActivityContent activityId={activityId} />;
}
