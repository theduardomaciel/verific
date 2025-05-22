// Components
import { ProjectSettingsSubscriptionsForm } from "./form";

// API
import { serverClient } from "@/lib/trpc/server";

export default async function SubscriptionsSettingsPage({
	params,
}: {
	params: Promise<{ projectId: string }>;
}) {
	const { projectId } = await params;

	// Fetch project data from the server
	const project = await serverClient.getProject({
		id: projectId,
	});

	return <ProjectSettingsSubscriptionsForm project={project} />;
}
