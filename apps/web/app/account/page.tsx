"use client";

// Components
import { EventsList } from "@/components/account/project-list";
import { AccountProjectsSkeleton } from "@/components/account/project-skeleton";

// API
import { trpc } from "@/lib/trpc/react";

export default function Home() {
	const { data: projects, isPending } = trpc.getProjects.useQuery();

	return (
		<main className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center">
			{isPending || !projects ? (
				<AccountProjectsSkeleton />
			) : (
				<EventsList projects={projects} />
			)}
		</main>
	);
}
