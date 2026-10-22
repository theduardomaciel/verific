import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ActivityFormContent } from "./content";

export const metadata: Metadata = {
	title: "Formulário da atividade",
};

export default function ActivityFormPage({
	params,
}: {
	params: Promise<{ activityId: string }>;
}) {
	return (
		<Suspense
			fallback={
				<div className="container-d py-container-v min-h-[calc(100dvh-4.5rem)]">
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
}: {
	params: Promise<{ activityId: string }>;
}) {
	const { activityId } = await params;

	return <ActivityFormContent key={activityId} activityId={activityId} />;
}
