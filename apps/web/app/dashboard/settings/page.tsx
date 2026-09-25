import { Suspense } from "react";

// Components
import { ProjectSettingsGeneral } from "./form";
import { SettingsFormSkeleton } from "./skeleton";

// API
import { getCurrentProject } from "@/lib/current-project";

async function GeneralSettingsContent() {
	const project = await getCurrentProject();

	return <ProjectSettingsGeneral project={project} />;
}

export default function ProjectSettings() {
	return (
		<Suspense fallback={<SettingsFormSkeleton />}>
			<GeneralSettingsContent />
		</Suspense>
	);
}
