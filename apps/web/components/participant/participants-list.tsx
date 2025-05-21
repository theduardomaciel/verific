import { cn } from "@/lib/utils";

// Components
import { ParticipantCard } from "../dashboard/participant-card";
import { Empty } from "@/components/empty";

// Types
import { RouterOutput } from "@verific/api";

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
	hasActivity?: boolean;
	participants: RouterOutput["getParticipants"]["participants"];
	emptyMessage?: {
		title: string;
		description: string;
	};
}

function List({
	activityId,
	hasActivity = false,
	participants,
	className,
	emptyMessage,
}: ListProps) {
	if (!participants || participants.length === 0) {
		return (
			<Empty
				title={emptyMessage?.title ?? "Nenhum participante encontrado"}
				description={
					emptyMessage?.description ??
					"Parece que ainda não há participantes nesta atividade."
				}
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
					activity={
						hasActivity
							? {
									id: activityId,
									participantJoinedAt: participant.joinedAt,
								}
							: undefined
					}
					showJoinedAt={hasActivity}
				/>
			))}
		</ul>
	);
}

export { Holder, Title, List };
