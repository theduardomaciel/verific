// import { ParticipantCard, ParticipantCardModal } from "@/components/participants/ParticipantCard";

import { ToDo } from "@/components/ToDo";

export default async function ParticipantModal(props: {
	params: Promise<{ participantId: string }>;
}) {
	const params = await props.params;

	//  <ParticipantCardModal>
	//      <ParticipantCard id={participantId} />
	//  </ParticipantCardModal>

	const { participantId } = params;

	return <ToDo />;
}
