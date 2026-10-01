import { Suspense } from "react";

import { ActivityContent } from "./content";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ActivityPage(props: {
	params: Promise<{ activityId: string }>;
}) {
	const { activityId } = await props.params;

	return (
		<Suspense
			fallback={
				<main className="py-container-v container-p flex min-h-screen flex-col items-center justify-start gap-9">
					<Skeleton className="h-64 w-full" />
				</main>
			}
		>
			<ActivityContent activityId={activityId} />
		</Suspense>
	);
}
