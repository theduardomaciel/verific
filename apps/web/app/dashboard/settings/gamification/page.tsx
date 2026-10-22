"use client";

import { Skeleton } from "@/components/ui/skeleton";

import { useDashboard } from "@/components/dashboard/dashboard-context";

import { trpc } from "@/lib/trpc/react";

import { GamificationEditor } from "./editor";

export default function GamificationSettingsPage() {
	const { projectId } = useDashboard();
	const settings = trpc.getGamificationSettings.useQuery(
		{ projectId },
		{ staleTime: 30_000, refetchOnWindowFocus: false },
	);

	if (settings.isPending) {
		return (
			<div className="flex flex-col gap-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-40 w-full rounded-2xl" />
				<Skeleton className="h-64 w-full rounded-2xl" />
			</div>
		);
	}

	if (settings.isError || !settings.data) {
		return (
			<p className="text-muted-foreground text-sm">
				Não foi possível carregar as configurações de gamificação.
			</p>
		);
	}

	return (
		<GamificationEditor
			projectId={projectId}
			initial={settings.data.config}
			eventDays={settings.data.eventDays}
			profilesEnabled={settings.data.profilesEnabled}
		/>
	);
}
