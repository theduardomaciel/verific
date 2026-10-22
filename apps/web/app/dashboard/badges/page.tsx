import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { BadgesContent } from "./content";

export const metadata: Metadata = {
	title: "Crachás",
};

export default function BadgesPage() {
	return (
		<div className="container-d py-container-v min-h-[calc(100dvh-var(--dashboard-header-height))]">
			<Suspense
				fallback={
					<div className="flex flex-col gap-4">
						<Skeleton className="h-10 w-64" />
						<Skeleton className="h-96 w-full" />
					</div>
				}
			>
				<BadgesContent />
			</Suspense>
		</div>
	);
}
