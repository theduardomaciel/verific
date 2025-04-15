import { cn } from "@/lib/utils";
import { ParticipantCard } from "./activity-participant";
import { ParticipantOnActivity } from "@/lib/types/participant-on-activity";

interface ParticipantsListProps {
	className?: string;
	isModerators?: boolean;
	activityId: string;
	participants: ParticipantOnActivity[];
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
			<h2 className="font-title text-neutral text-lg font-extrabold">
				{isModerators ? "Responsáveis" : "Membros"}
			</h2>
			{participants && participants.length > 0 && (
				<ul className="flex w-full flex-col items-start justify-start gap-4">
					{participants.map((participantOnActivity) => {
						const participant = {
							...participantOnActivity.participant,
							role: participantOnActivity.role,
						};

						return (
							<ParticipantCard
								key={participant.id}
								participant={participant}
								participantCardHref={`/dashboard/events/${activityId}/participant/${participant.id}`}
								event={{
									id: activityId,
									participantJoinedAt: participant.joinedAt,
								}}
							/>
						);
					})}
				</ul>
			)}
		</div>
	);
}
