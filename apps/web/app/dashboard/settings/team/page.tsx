"use client";

import { ProjectContributors } from "@/components/settings/project-contributors";

import { useCurrentProject } from "@/hooks/use-current-project";

import { SettingsFormSkeleton } from "../skeleton";

export default function ProjectSettingsTeam() {
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

	return (
		<ProjectContributors
			projectId={data.project.id}
			ownerId={data.project.ownerId}
		/>
	);
}
