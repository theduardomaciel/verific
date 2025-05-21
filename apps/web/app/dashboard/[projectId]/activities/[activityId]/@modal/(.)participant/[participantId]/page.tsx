/* import { ParticipantCard, ParticipantCardModal } from "@/components/participants/participant-card"; */

import { ToDo } from "@/components/to-do";

export default async function ParticipantModal(props: {
	params: Promise<{ participantId: string }>;
}) {
	const params = await props.params;
	const { participantId } = params;

	return <ToDo />;
}

{
	/* <ParticipantCardModal>
			<ParticipantCard id={participantId} />
		</ParticipantCardModal> */
}
