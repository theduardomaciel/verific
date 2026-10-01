// Components
import { ScheduleContent } from "./schedule-content";

// Data
import { getCachedActivities } from "@/lib/data";

interface Props {
	project: {
		id: string;
		url: string;
	};
}

export async function ScheduleWrapper({ project }: Props) {
	const { activities } = await getCachedActivities({
		projectId: project.id,
		pageSize: 1000, // Fetch all activities for the schedule
	});

	return <ScheduleContent activities={activities} eventUrl={project.url} />;
}
