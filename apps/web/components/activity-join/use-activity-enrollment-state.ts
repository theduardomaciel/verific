"use client";

import { useMemo } from "react";

import type { RouterOutput } from "@verific/api";

// Hooks
import { useSubscribedActivities } from "@/hooks/use-subscribed-activities";
// Lib
import {
	isActivityEnded,
	isActivityFull,
	isRegistrationClosed,
} from "@/lib/activity-conditions";
// API
import { trpc } from "@/lib/trpc/react";

export type ActivityDetail = RouterOutput["getActivity"]["activity"];

export type EnrollmentState =
	| "loading"
	| "signed-out"
	| "not-in-event"
	| "already-subscribed"
	| "ended"
	| "registration-closed"
	| "full"
	| "form";

export interface PublishedActivityForm {
	fields: NonNullable<RouterOutput["getPublishedForm"]>["fields"];
	sections: NonNullable<RouterOutput["getPublishedForm"]>["sections"];
}

interface UseActivityEnrollmentStateArgs {
	activity: ActivityDetail;
	eventUrl: string;
	/** Total de inscritos (resolvido no servidor, público e estático). */
	participantsCount: number | null;
}

export interface ActivityEnrollment {
	state: EnrollmentState;
	userId?: string | null;
	participantId: string | null;
	subscribedIds: string[] | undefined;
	hasEnded: boolean;
	seatsFull: boolean;
	form: PublishedActivityForm;
	hasForm: boolean;
	isResolvingForm: boolean;
}

/**
 * Deriva o estado da máquina de inscrição em ordem de prioridade:
 * sessão → vínculo com o evento → inscrição na atividade → situação da
 * atividade → formulário. Reutiliza `useSubscribedActivities` (sem gate
 * duplicado) e resolve o formulário publicado em paralelo.
 */
export function useActivityEnrollmentState({
	activity,
	eventUrl,
	participantsCount,
}: UseActivityEnrollmentStateArgs): ActivityEnrollment {
	const { userId, subscribedIds, participantId, isPending } =
		useSubscribedActivities(eventUrl);

	const formQuery = trpc.getPublishedForm.useQuery(
		{
			projectId: activity.projectId,
			activityId: activity.id,
		},
		{
			staleTime: 60 * 1000,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false,
		},
	);

	const form = useMemo<PublishedActivityForm>(
		() => ({
			fields: (formQuery.data?.fields ?? []).filter((f) => f.isVisible),
			sections: formQuery.data?.sections ?? [],
		}),
		[formQuery.data],
	);

	const hasEnded = isActivityEnded(activity.sessions);
	const seatsFull = isActivityFull(
		activity.participantsLimit,
		participantsCount,
	);

	const state: EnrollmentState = (() => {
		if (isPending || formQuery.isPending) return "loading";
		if (!userId) return "signed-out";
		if (!participantId) return "not-in-event";
		if (subscribedIds?.includes(activity.id)) return "already-subscribed";
		if (hasEnded) return "ended";
		if (isRegistrationClosed(activity)) return "registration-closed";
		if (seatsFull) return "full";
		return "form";
	})();

	return {
		state,
		userId,
		participantId: participantId ?? null,
		subscribedIds,
		hasEnded,
		seatsFull,
		form,
		hasForm: form.fields.length > 0,
		isResolvingForm: formQuery.isPending,
	};
}
