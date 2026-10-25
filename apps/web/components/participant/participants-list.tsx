// Types
import type { RouterOutput } from "@verific/api";

import { Empty } from "@/components/empty";

import { cn } from "@/lib/utils";

// Components
import { ParticipantListItem } from "./participant-item";

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
		<h2 className={cn("text-foreground text-lg font-extrabold", className)}>
			{children}
		</h2>
	);
}

interface ListProps {
	className?: string;
	activityId: string;
	projectUrl: string;
	/** Id do participante do usuário logado nesta atividade (esconde a
	 * remoção da própria linha). */
	currentParticipantId?: string | null;
	hasActivity?: boolean;
	participants: RouterOutput["getActivity"]["activity"]["participants"];
	sessions?: RouterOutput["getActivity"]["activity"]["sessions"];
	emptyMessage?: {
		title: string;
		description: string;
	};
}

function List({
	hasActivity = false,
	participants,
	sessions,
	projectUrl,
	currentParticipantId,
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
				<ParticipantListItem.Activity
					key={participant.id}
					participant={participant}
					sessions={sessions}
					showJoinedAt={hasActivity}
					url={projectUrl}
					currentParticipantId={currentParticipantId}
				/>
			))}
		</ul>
	);
}

export { Holder, Title, List };
