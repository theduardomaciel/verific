"use client";

import { useActivityAvailability } from "@/hooks/use-activity-availability";

import { ActivityDetails } from "./activity-details";
import { ActivityEnrollmentPanel } from "./activity-enrollment-panel";

import type { ActivityDetail } from "./use-activity-enrollment-state";

interface ActivityDetailContentProps {
	activity: ActivityDetail;
	eventUrl: string;
	initialParticipantsCount: number | null;
}

/**
 * Conteúdo da página de atividade que depende da contagem volátil.
 *
 * O servidor entrega a contagem cacheada como ponto de partida; a query
 * pública substitui o valor depois da hidratação. Os dois lados (badge de
 * vagas e painel de inscrição) leem o mesmo número, então não há divergência
 * entre "Esgotado" no topo e o botão de fila no painel.
 */
export function ActivityDetailContent({
	activity,
	eventUrl,
	initialParticipantsCount,
}: ActivityDetailContentProps) {
	const { byActivity } = useActivityAvailability({
		projectId: activity.projectId,
		activityIds: [activity.id],
	});

	const participantsCount =
		byActivity.get(activity.id)?.participantsCount ??
		initialParticipantsCount;

	return (
		<>
			<div className="min-w-0 text-base">
				<ActivityDetails
					activity={activity}
					participantsCount={participantsCount}
					projectUrl={eventUrl}
				/>
			</div>
			<ActivityEnrollmentPanel
				activity={activity}
				eventUrl={eventUrl}
				participantsCount={participantsCount}
			/>
		</>
	);
}
