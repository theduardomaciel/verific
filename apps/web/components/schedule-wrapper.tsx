import { cacheLife, cacheTag } from "next/cache";

// Data
import { getCachedActivities } from "@/lib/data";

// Components
import { ScheduleContent } from "./schedule-content";

interface Props {
	project: {
		id: string;
		url: string;
	};
}

export async function ScheduleWrapper({ project }: Props) {
	"use cache";
	cacheLife("hours");
	cacheTag("activities", `activities:${project.id}`);

	const { activities } = await getCachedActivities({
		projectId: project.id,
		pageSize: 1000, // Fetch all activities for the schedule
	});

	return <ScheduleContent activities={activities} eventUrl={project.url} />;
}
