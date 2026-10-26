"use client";

import { EventsList } from "@/components/account/project-list";
import { AccountProjectsSkeleton } from "@/components/account/project-skeleton";

import { trpc } from "@/lib/trpc/react";

export default function Home() {
	const { data: projects, isPending } = trpc.getProjects.useQuery(undefined, {
		staleTime: 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false,
	});

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
