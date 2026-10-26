"use client";

import { useCurrentProject } from "@/hooks/use-current-project";

import { SettingsFormSkeleton } from "../skeleton";
import { ProjectSettingsPreferencesForm } from "./form";

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
