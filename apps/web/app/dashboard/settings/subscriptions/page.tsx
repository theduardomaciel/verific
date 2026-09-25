import { Suspense } from "react";

// Components
import { ProjectSettingsSubscriptionsForm } from "./form";
import { SettingsFormSkeleton } from "../skeleton";

// API
import { getCurrentProject } from "@/lib/current-project";

async function SubscriptionsSettingsContent() {
	const project = await getCurrentProject();

	return <ProjectSettingsSubscriptionsForm project={project} />;
}

export default function SubscriptionsSettingsPage() {
	return (
		<Suspense fallback={<SettingsFormSkeleton />}>
			<SubscriptionsSettingsContent />
		</Suspense>
	);
}
