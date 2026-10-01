import { notFound } from "next/navigation";

import { ActivityJoinModalContent } from "@/components/activity-join";

// API
import { getCachedActivity } from "@/lib/data";

export default async function Page({
	params,
}: {
	params: Promise<{ activityId: string; eventUrl: string }>;
}) {
	const { activityId, eventUrl } = await params;

	const data = await getCachedActivity({ activityId }).catch(() => null);

	if (!data?.activity) {
		notFound();
	}

	return (
		<ActivityJoinModalContent
			activity={data.activity}
			eventUrl={eventUrl}
		/>
	);
}
