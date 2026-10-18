import { Suspense } from "react";

import { ParticipantCardDialog } from "@/components/dialogs/participant-card-dialog";
import {
	ParticipantCard,
	ParticipantCardSkeleton,
} from "@/components/participant/participant-card";

export default function ParticipantModal(props: {
	params: Promise<{ participantId: string }>;
}) {
	return (
		<ParticipantCardDialog>
			<Suspense fallback={<ParticipantCardSkeleton />}>
				<ParticipantModalLoader params={props.params} />
			</Suspense>
		</ParticipantCardDialog>
	);
}

async function ParticipantModalLoader({
	params,
}: {
	params: Promise<{ participantId: string }>;
}) {
	const { participantId } = await params;

	return <ParticipantCard id={participantId} />;
}
