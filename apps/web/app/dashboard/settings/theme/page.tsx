"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentProject } from "@/hooks/use-current-project";
import { parseEventTheme } from "@verific/drizzle/theme";
import { ThemeEditor } from "./editor";
import { ProjectBrandingForm } from "./branding-form";

export default function ThemeSettingsPage() {
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
				Não foi possível carregar o tema. Tente recarregar a página.
			</p>
		);
	}

	const { project } = data;
	const initial = parseEventTheme({
		theme: (project as { theme?: unknown }).theme,
		primaryColor: project.primaryColor,
		secondaryColor: project.secondaryColor,
	});

	return (
		<>
			<ThemeEditor
				key={project.id}
				projectId={project.id}
				projectUrl={project.url}
				projectName={project.name}
				initial={initial}
			/>
			<ProjectBrandingForm project={project} />
		</>
	);
}
