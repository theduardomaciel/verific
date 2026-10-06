import { Suspense } from "react";
import type { Metadata } from "next";
import { FormsContent } from "./content";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
	title: "Formulários",
};

export default function FormsPage() {
	return (
		<Suspense
			fallback={
				<div className="container-d py-container-v min-h-screen">
					<Skeleton className="h-96 w-full" />
				</div>
			}
		>
			<FormsContent />
		</Suspense>
	);
}
