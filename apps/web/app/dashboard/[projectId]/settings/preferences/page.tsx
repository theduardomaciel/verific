// Components
import { ProjectSettingsPreferencesForm } from "./form";

// API
import { serverClient } from "@/lib/trpc/server";

export default async function PreferencesSettingsPage({
	params,
}: {
	params: Promise<{ projectId: string }>;
}) {
	const { projectId } = await params;

	// Fetch project data from the server
	const project = await serverClient.getProject({
		id: projectId,
	});

	return <ProjectSettingsPreferencesForm project={project} />;
}
