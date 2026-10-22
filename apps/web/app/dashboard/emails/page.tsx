import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { EmailsContent } from "./content";

export const metadata: Metadata = {
	title: "E-mails",
};

export default function EmailsPage() {
	return (
		<Suspense
			fallback={
				<div className="container-d py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col gap-6">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0 space-y-2">
							<Skeleton className="h-7 w-40" />
							<Skeleton className="h-4 w-72" />
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<Skeleton className="h-10 w-10" />
							<Skeleton className="h-10 w-36" />
						</div>
					</div>
					<Skeleton className="h-24 w-full" />
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<Skeleton className="h-10 w-full sm:max-w-sm" />
							<Skeleton className="h-9 w-64" />
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{Array.from({ length: 6 }).map((_, i) => (
								<Skeleton key={i} className="h-7 w-24" />
							))}
						</div>
					</div>
					<div className="space-y-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-64 w-full" />
					</div>
				</div>
			}
		>
			<EmailsContent />
		</Suspense>
	);
}
