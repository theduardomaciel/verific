import { ParticipantCard } from "@/components/dashboard/participant-card";
import { Participant } from "@/lib/types/participant";

interface ParticipantListProps {
	participants: Participant[];
}

export function ParticipantList({ participants }: ParticipantListProps) {
	if (participants.length === 0) {
		return (
			<div className="rounded-md border p-8 text-center">
				<h3 className="text-lg font-medium">
					Nenhum participante encontrado
				</h3>
				<p className="mt-2 text-sm text-gray-500">
					Tente ajustar seus filtros ou pesquisar com outros termos.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-start justify-start gap-4">
			{participants.map((participant) => (
				<ParticipantCard
					participant={participant}
					participantCardHref={`/dashboard/participants/${participant.id}`}
					key={participant.id}
				/>
			))}
		</div>
	);
}
