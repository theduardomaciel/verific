import { getCachedActivities } from "@/lib/data";

import { ScheduleContent } from "./schedule-content";

interface Props {
	project: {
		id: string;
		url: string;
	};
}

/**
 * Sem `"use cache"` próprio: a lista vem de `getCachedActivities`, que já
 * tem cache com tag `project-activities:<id>` e vida longa. Um cache
 * externo aqui criaria uma segunda entrada (com vida/tag próprias,
 * podendo mascarar a invalidação) sem nenhum ganho.
 */
export async function ScheduleWrapper({ project }: Props) {
	const { activities } = await getCachedActivities({
		projectId: project.id,
		pageSize: 1000, // Fetch all activities for the schedule
	});

	return (
		<ScheduleContent
			activities={activities}
			projectId={project.id}
			eventUrl={project.url}
		/>
	);
}
