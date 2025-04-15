import { cn } from "@/lib/utils";
import { ParticipantCard } from "../participant-card";
import { Participant } from "@/lib/types/participant";

interface ParticipantsListProps {
	className?: string;
	isModerators?: boolean;
	activityId: string;
	participants: Participant[];
}

export function ParticipantsList({
	className,
	isModerators = false,
	activityId,
	participants,
}: ParticipantsListProps) {
	return (
		<div
			className={cn(
				"flex w-full flex-col items-start justify-start gap-4",
				className,
			)}
		>
			<h2 className="font-title text-foreground text-lg font-extrabold">
				{isModerators ? "Responsáveis" : "Membros"}
			</h2>
			{participants && participants.length > 0 && (
				<ul className="flex w-full flex-col items-start justify-start gap-4">
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
			)}
		</div>
	);
}
