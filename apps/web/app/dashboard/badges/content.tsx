"use client";

import { parseEventTheme } from "@verific/drizzle/theme";

import { Skeleton } from "@/components/ui/skeleton";

import { useDashboard } from "@/components/dashboard/dashboard-context";

import { useCurrentProject } from "@/hooks/use-current-project";
import { trpc } from "@/lib/trpc/react";

import { BadgeEditor } from "./editor";

import type { ThemeFontRoles } from "@/lib/badges/client";

export function BadgesContent() {
	const { projectId } = useDashboard();
	const project = useCurrentProject();
	const layoutQuery = trpc.getLayout.useQuery(
		{ projectId },
		{ staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false },
	);
	const fieldsQuery = trpc.getBadgeFieldOptions.useQuery(
		{ projectId },
		{ staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false },
	);

	if (project.isPending || layoutQuery.isPending || fieldsQuery.isPending) {
		return (
			<div className="flex flex-col gap-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	if (
		project.isError ||
		!project.data?.project ||
		layoutQuery.isError ||
		fieldsQuery.isError
	) {
		return (
			<p className="text-muted-foreground text-sm">
				Não foi possível carregar o editor de crachás. Tente recarregar
				a página.
			</p>
		);
	}

	const theme = parseEventTheme({
		theme: (project.data.project as { theme?: unknown }).theme,
		primaryColor: project.data.project.primaryColor,
		secondaryColor: project.data.project.secondaryColor,
	});
	const roles: ThemeFontRoles = {
		heading: {
			family: theme.fonts.heading.family,
			weights: theme.fonts.heading.weights,
			scale: theme.fonts.heading.scale,
		},
		subtitle: {
			family: theme.fonts.subtitle.family,
			weights: theme.fonts.subtitle.weights,
			scale: theme.fonts.subtitle.scale,
		},
		body: {
			family: theme.fonts.body.family,
			weights: theme.fonts.body.weights,
			scale: theme.fonts.body.scale,
		},
	};

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h1 className="text-2xl font-semibold">Crachás</h1>
				<p className="text-muted-foreground text-sm">
					Desenhe a área de dados sobre a arte e imprima em folha ou
					papel pré-impresso.
				</p>
			</div>
			<BadgeEditor
				key={projectId}
				projectId={projectId}
				eventUrl={layoutQuery.data.eventUrl}
				roles={roles}
				fieldOptions={fieldsQuery.data.fields}
				initial={layoutQuery.data.layout}
				profilesEnabled={layoutQuery.data.profilesEnabled ?? false}
			/>
		</div>
	);
}
