import { JoinActivityDialog } from "@/components/dialogs/join-activity-dialog";

// API
import { serverClient } from "@/lib/trpc/server";

export default async function Page({
	params,
}: {
	params: Promise<{ activityId: string; eventUrl: string }>;
}) {
	const { activityId, eventUrl } = await params;

	const { participantId } = await serverClient.getParticipantIdByProjectUrl({
		projectUrl: eventUrl,
	});

	const { activity } = await serverClient.getActivity({
		activityId,
	});

	return (
		<JoinActivityDialog activity={activity} participantId={participantId} />
	);
}
