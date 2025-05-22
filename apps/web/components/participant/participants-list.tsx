import { cn } from "@/lib/utils";

// Components
import { ActivityParticipantCard } from "../dashboard/participant-card";
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
	participants: RouterOutput["getActivity"]["activity"]["participants"];
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
					"Parece que ainda não há participantes inscritos nesta atividade."
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
				<ActivityParticipantCard
					key={participant.id}
					participant={participant}
					showJoinedAt={hasActivity}
				/>
			))}
		</ul>
	);
}

export { Holder, Title, List };
