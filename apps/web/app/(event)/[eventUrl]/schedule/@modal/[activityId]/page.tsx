import { JoinActivityDialog } from "@/components/join-activity-dialog";

// API
import { serverClient } from "@/lib/trpc/server";
import { auth } from "@verific/auth";

export default async function Page({
	params,
}: {
	params: Promise<{ activityId: string }>;
}) {
	const { activityId } = await params;

	const { activity } = await serverClient.getActivity({
		activityId,
	});

	const session = await auth();

	return (
		<JoinActivityDialog
			activity={activity}
			participantId={session?.participant?.id}
		/>
	);
}
