import { ParticipantCard } from "../participant-card";
import { Participant } from "@/lib/types/participant";
import { Empty } from "@/components/empty";
import { cn } from "@/lib/utils";

interface Props {
	className?: string;
	children: React.ReactNode;
}

function Holder({ children, className }: Props) {
	return (
		<div
			className={cn(
				"flex w-full flex-col items-start justify-start gap-4",
				className,
			)}
		>
			{children}
		</div>
	);
}

function Title({ children, className }: Props) {
	return (
		<h2
			className={cn(
				"font-title text-foreground text-lg font-extrabold",
				className,
			)}
		>
			{children}
		</h2>
	);
}

interface ListProps {
	className?: string;
	activityId: string;
	participants: Participant[];
}

function List({ activityId, participants, className }: ListProps) {
	if (!participants || participants.length === 0) {
		return (
			<Empty
				title="Nenhum participante encontrado"
				description="Parece que ainda não há participantes nesta atividade."
			/>
		);
	}
	return (
		<ul
			className={cn(
				"flex w-full flex-col items-start justify-start gap-4",
				className,
			)}
		>
			{participants.map((participant) => (
				<ParticipantCard
					key={participant.id}
					participant={participant}
					participantCardHref={`/dashboard/events/${activityId}/participant/${participant.id}`}
					activity={{
						id: activityId,
						participantJoinedAt: participant.joinedAt,
					}}
				/>
			))}
		</ul>
	);
}

export { Holder, Title, List };
