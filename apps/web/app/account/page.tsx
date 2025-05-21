// Components
import { EventsList } from "@/components/account/event-list";

// API
import { serverClient } from "@/lib/trpc/server";

export default async function Home() {
	const projects = await serverClient.getProjects();

	return (
		<main className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center">
			<EventsList projects={projects} />
		</main>
	);
}
