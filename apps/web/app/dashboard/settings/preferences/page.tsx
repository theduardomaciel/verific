"use client";

// Components
import { ProjectSettingsPreferencesForm } from "./form";
import { SettingsFormSkeleton } from "../skeleton";

// API
import { useCurrentProject } from "@/hooks/use-current-project";

export default function PreferencesSettingsPage() {
	const { data, isPending, isError } = useCurrentProject();

	if (isPending) {
		return <SettingsFormSkeleton />;
	}

	if (isError || !data?.project) {
		return (
			<p className="text-muted-foreground text-sm">
				Não foi possível carregar as configurações. Tente recarregar a
				página.
			</p>
		);
	}

	return <ProjectSettingsPreferencesForm project={data.project} />;
}
