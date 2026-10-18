import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { FormsContent } from "./content";

export const metadata: Metadata = {
	title: "Formulários",
};

export default function FormsPage() {
	return (
		<Suspense
			fallback={
				<div className="container-d min-h-screen">
					<Skeleton className="h-96 w-full" />
				</div>
			}
		>
			<FormsContent />
		</Suspense>
	);
}
