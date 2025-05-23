import { cookies } from "next/headers";

// Components
import { ProjectSettingsGeneral } from "./form";

// API
import { serverClient } from "@/lib/trpc/server";

export default async function ProjectSettings() {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")!.value;

	// Fetch project data from the server
	const { project } = await serverClient.getProject({
		id: projectId,
	});

	return <ProjectSettingsGeneral project={project} />;
}
