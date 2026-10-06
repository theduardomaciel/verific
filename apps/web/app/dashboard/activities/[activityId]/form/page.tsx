import { Suspense } from "react";
import type { Metadata } from "next";
import { ActivityFormContent } from "./content";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
	title: "Formulário da atividade",
};

export default function ActivityFormPage({
	params,
}: {
	params: { activityId: string };
}) {
	return (
		<Suspense
			fallback={
				<div className="container-d py-container-v min-h-screen">
					<Skeleton className="h-96 w-full" />
				</div>
			}
		>
			<ActivityFormContent activityId={params.activityId} />
		</Suspense>
	);
}
