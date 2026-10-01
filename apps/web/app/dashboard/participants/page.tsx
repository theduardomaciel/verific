import { Suspense } from "react";
import type { Metadata } from "next";

import { ParticipantsContent } from "./content";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
	title: "Participantes",
};

export default function ParticipantsPage() {
	return (
		<Suspense
			fallback={
				<div className="container-d py-container-v min-h-screen">
					<Skeleton className="h-96 w-full" />
				</div>
			}
		>
			<ParticipantsContent />
		</Suspense>
	);
}
