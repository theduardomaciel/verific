import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ActivitiesContent } from "./content";

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
