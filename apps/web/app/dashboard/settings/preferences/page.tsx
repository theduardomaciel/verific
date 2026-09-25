import { Suspense } from "react";

// Components
import { ProjectSettingsPreferencesForm } from "./form";
import { SettingsFormSkeleton } from "../skeleton";

// API
import { getCurrentProject } from "@/lib/current-project";

async function PreferencesSettingsContent() {
	const project = await getCurrentProject();

	return <ProjectSettingsPreferencesForm project={project} />;
}

export default function PreferencesSettingsPage() {
	return (
		<Suspense fallback={<SettingsFormSkeleton />}>
			<PreferencesSettingsContent />
		</Suspense>
	);
}
