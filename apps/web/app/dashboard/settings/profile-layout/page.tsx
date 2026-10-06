"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentProject } from "@/hooks/use-current-project";
import { parseProfileLayout } from "@verific/drizzle/profile-layout";
import { ProfileLayoutEditor } from "./editor";

export default function ProfileLayoutSettingsPage() {
	const { data, isPending, isError } = useCurrentProject();

	if (isPending) {
		return (
			<div className="flex flex-col gap-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	if (isError || !data?.project) {
		return (
			<p className="text-muted-foreground text-sm">
				Não foi possível carregar o layout. Tente recarregar a página.
			</p>
		);
	}

	const { project } = data;
	const initial = parseProfileLayout(
		(project as { profileLayout?: unknown }).profileLayout,
	);

	return (
		<ProfileLayoutEditor
			key={project.id}
			projectId={project.id}
			projectUrl={project.url}
			initial={initial}
		/>
	);
}
