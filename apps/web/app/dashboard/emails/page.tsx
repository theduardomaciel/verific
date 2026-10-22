import type { Metadata } from "next";
import { Suspense } from "react";

import { EmailsContent } from "./content";
import { EmailsSkeleton } from "./skeleton";

export const metadata: Metadata = {
	title: "E-mails",
};

export default function EmailsPage() {
	return (
		<Suspense fallback={<EmailsSkeleton />}>
			<EmailsContent />
		</Suspense>
	);
}
