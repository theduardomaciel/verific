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
				<div className="container-d py-container-v min-h-[calc(100dvh-4.5rem)]">
					<Skeleton className="h-96 w-full" />
				</div>
			}
		>
			<EmailsContent />
		</Suspense>
	);
}
