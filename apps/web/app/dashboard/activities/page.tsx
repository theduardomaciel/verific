import { Suspense } from "react";
import type { Metadata } from "next";

import { ActivitiesContent } from "./content";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
	title: "Atividades",
};

export default function ActivitiesPage() {
	return (
		<Suspense
			fallback={
				<div className="container-d py-container-v min-h-screen">
					<Skeleton className="h-96 w-full" />
				</div>
			}
		>
			<ActivitiesContent />
		</Suspense>
	);
}
