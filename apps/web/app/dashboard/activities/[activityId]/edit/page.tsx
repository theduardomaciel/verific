import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

// Components
import { EditActivityContent } from "./content";

export const metadata: Metadata = {
	title: "Editar Atividade",
};

export default function EditActivity({
	params,
}: {
	params: Promise<{ activityId: string }>;
}) {
	return (
		<Suspense
			fallback={
				<main className="container-p py-container-v flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-start">
					<Skeleton className="h-96 w-full" />
				</main>
			}
		>
			<EditActivityLoader params={params} />
		</Suspense>
	);
}

async function EditActivityLoader({
	params,
}: {
	params: Promise<{ activityId: string }>;
}) {
	const { activityId } = await params;

	return <EditActivityContent activityId={activityId} />;
}
