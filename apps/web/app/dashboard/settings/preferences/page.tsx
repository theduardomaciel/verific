import { cookies } from "next/headers";

// Components
import { ProjectSettingsPreferencesForm } from "./form";

// API
import { getProject } from "@/lib/data";

export default async function PreferencesSettingsPage() {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")!.value;

	// Fetch project data from the server
	const { project } = await getProject(projectId);

	return <ProjectSettingsPreferencesForm project={project} />;
}
