import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ActivityFormContent } from "./content";

export const metadata: Metadata = {
	title: "Formulário da atividade",
};

export default function ActivityFormPage({
	params,
}: PageProps<"/dashboard/activities/[activityId]/form">) {
	return (
		<Suspense
			fallback={
				<div className="container-d py-container-v min-h-[calc(100dvh-var(--dashboard-header-height))]">
					<Skeleton className="h-96 w-full" />
				</div>
			}
		>
			<ActivityFormLoader params={params} />
		</Suspense>
	);
}

async function ActivityFormLoader({
	params,
}: Pick<PageProps<"/dashboard/activities/[activityId]/form">, "params">) {
	const { activityId } = await params;

	return <ActivityFormContent key={activityId} activityId={activityId} />;
}
