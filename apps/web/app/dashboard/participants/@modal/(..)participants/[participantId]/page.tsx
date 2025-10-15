import { ParticipantCardDialog } from "@/components/dialogs/participant-card-dialog";
import { ParticipantCard } from "@/components/participant/participant-card";

export default async function ParticipantModal(props: {
	params: Promise<{ participantId: string }>;
}) {
	const params = await props.params;

	const { participantId } = params;

	return (
		<ParticipantCardDialog>
			<ParticipantCard id={participantId} />
		</ParticipantCardDialog>
	);
}
