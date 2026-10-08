"use client";

import { useMemo, useState } from "react";

// Types
import type { ActivityDetail } from "@/components/activity-join/use-activity-enrollment-state";

// Hooks
import { useSubscribedActivities } from "@/hooks/use-subscribed-activities";
// Lib
import { findScheduleConflicts, type Conflict } from "@/lib/schedule/conflicts";
// API
import { trpc } from "@/lib/trpc/react";

/**
 * Conflitos da atividade da página contra as atividades do usuário no
 * evento (`getActivitiesFromParticipant` já traz as sessões: sem
 * mudança de API). Vazio para anônimo, fora do evento e já inscrito —
 * e vazio enquanto carrega, para o aviso nunca piscar.
 */
export function useScheduleConflicts(
	activity: ActivityDetail,
	eventUrl: string,
): { conflicts: Conflict[]; isLoading: boolean } {
	const { userId, participantId, subscribedIds, isPending } =
		useSubscribedActivities(eventUrl);

	const enrolledQuery = trpc.getActivitiesFromParticipant.useQuery(
		{ projectUrl: eventUrl },
		{
			enabled: Boolean(userId && participantId),
			staleTime: 60 * 1000,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false,
		},
	);

	// `now` congelado na montagem (regras `react(purity)`/
	// `set-state-in-effect` barram relógio no render): suficiente para
	// avisos consultivos, recalculados a cada navegação.
	const [now] = useState(() => new Date());

	const conflicts = useMemo(() => {
		if (!userId || !participantId) return [];
		if (subscribedIds?.includes(activity.id)) return [];
		const enrolled = (enrolledQuery.data?.activities ?? []).filter(
			(a) => a.id !== activity.id,
		);
		return findScheduleConflicts(activity, enrolled, now);
	}, [
		userId,
		participantId,
		subscribedIds,
		enrolledQuery.data,
		activity,
		now,
	]);

	const isLoading =
		isPending ||
		(Boolean(userId && participantId) && enrolledQuery.isPending);

	return { conflicts, isLoading };
}
