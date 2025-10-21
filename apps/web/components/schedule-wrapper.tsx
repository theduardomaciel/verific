// Components
import { ScheduleContent } from "./schedule-content";

// Data
import {
	getCachedActivities,
	getCachedSubscribedActivitiesIdsFromParticipant,
} from "@/lib/data";

// Auth
import { auth } from "@verific/auth";

interface Props {
	project: {
		id: string;
		url: string;
	};
}

export async function ScheduleWrapper({ project }: Props) {
	const session = await auth();
	const userId = session?.user.id;

	const { activities } = await getCachedActivities({
		projectId: project.id,
		pageSize: 1000, // Fetch all activities for the schedule
	});

	const result = userId
		? await getCachedSubscribedActivitiesIdsFromParticipant(userId)
		: null;

	return (
		<ScheduleContent
			activities={activities}
			userId={userId}
			result={result}
			eventUrl={project.url}
		/>
	);
}
