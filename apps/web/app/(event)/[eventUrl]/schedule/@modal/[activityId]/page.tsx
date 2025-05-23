import { JoinActivityDialog } from "@/components/dialogs/join-activity-dialog";

// API
import { serverClient } from "@/lib/trpc/server";

export default async function Page({
	params,
}: {
	params: Promise<{ activityId: string }>;
}) {
	const { activityId } = await params;

	const { activity, participantId } = await serverClient.getActivity({
		activityId,
	});

	return (
		<JoinActivityDialog activity={activity} participantId={participantId} />
	);
}
