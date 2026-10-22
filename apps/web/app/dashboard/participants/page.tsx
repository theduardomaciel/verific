import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ParticipantsContent } from "./content";

export const metadata: Metadata = {
	title: "Participantes",
};

export default function ParticipantsPage() {
	return (
		<Suspense
			fallback={
				<div className="container-d py-container-v min-h-[calc(100dvh-4.5rem)]">
					<Skeleton className="h-96 w-full" />
				</div>
			}
		>
			<ParticipantsContent />
		</Suspense>
	);
}
