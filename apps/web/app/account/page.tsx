// Components
import { Suspense } from "react";
import { EventsList } from "@/components/account/project-list";
import { AccountProjectsSkeleton } from "@/components/account/project-skeleton";

// API
import { getCachedAccountProjects } from "@/lib/trpc/server";

async function AccountProjects() {
	const projects = await getCachedAccountProjects();

	return <EventsList projects={projects} />;
}

export default function Home() {
	return (
		<main className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center">
			<Suspense fallback={<AccountProjectsSkeleton />}>
				<AccountProjects />
			</Suspense>
		</main>
	);
}
