import { cookies } from "next/headers";

// Components
import { ProjectSettingsGeneral } from "./form";

// API
import { getProject } from "@/lib/data";

export default async function ProjectSettings() {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")!.value;

	// Fetch project data from the server
	const { project } = await getProject(projectId);

	return <ProjectSettingsGeneral project={project} />;
}
