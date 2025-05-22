// Components
import { ProjectSettingsGeneral } from "./form";

// API
import { serverClient } from "@/lib/trpc/server";

export default async function ProjectSettings({
	params,
}: {
	params: Promise<{ projectId: string }>;
}) {
	const { projectId } = await params;

	// Fetch project data from the server
	const project = await serverClient.getProject({
		id: projectId,
	});

	return <ProjectSettingsGeneral project={project} />;
}
