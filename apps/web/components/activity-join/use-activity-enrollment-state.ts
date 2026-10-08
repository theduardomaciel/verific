"use client";

import { useMemo } from "react";

import type { RouterOutput } from "@verific/api";

import { useScheduleConflicts } from "@/hooks/use-schedule-conflicts";
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

// Types
import type { Conflict } from "@/lib/schedule/conflicts";

export type ActivityDetail = RouterOutput["getActivity"]["activity"];

export type EnrollmentState =
	| "loading"
	| "signed-out"
	| "not-in-event"
	| "already-subscribed"
	| "offered"
	| "waitlisted"
	| "ended"
	| "registration-closed"
	| "schedule-conflict"
	| "waitlist"
	| "form";

export type WaitlistEntry = RouterOutput["getMyWaitlistEntries"][number];

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
	conflicts: Conflict[];
	/** Lugar do usuário na fila desta atividade, se estiver nela. */
	waitlistEntry: WaitlistEntry | null;
	form: PublishedActivityForm;
	hasForm: boolean;
	isResolvingForm: boolean;
}

/**
 * Deriva o estado da máquina de inscrição em ordem de prioridade:
 * sessão → vínculo com o evento → inscrição ou lugar na fila → situação
 * da atividade → conflito de horário → fila (lotada) ou formulário. Reutiliza
 * `useSubscribedActivities` (sem gate duplicado) e resolve o formulário
 * publicado e as atividades inscritas em paralelo.
 *
 * O conflito vem antes da fila porque também impede entrar nela, e o
 * usuário resolve: basta cancelar a outra inscrição. Enquanto as
 * atividades inscritas carregam para quem chegaria ao formulário, o
 * estado é `loading` (sem flash do form);
 * se a leitura falhar, cai no formulário — o servidor impõe o bloqueio.
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

	const waitlistQuery = trpc.getMyWaitlistEntries.useQuery(
		{ projectUrl: eventUrl },
		{ enabled: Boolean(participantId), refetchOnWindowFocus: true },
	);
	const waitlistEntry =
		waitlistQuery.data?.find((entry) => entry.activityId === activity.id) ??
		null;

	const { conflicts, isLoading: conflictsLoading } = useScheduleConflicts(
		activity,
		eventUrl,
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
		if (waitlistQuery.isPending) return "loading";
		if (waitlistEntry?.status === "offered") return "offered";
		if (waitlistEntry) return "waitlisted";
		if (hasEnded) return "ended";
		if (isRegistrationClosed(activity)) return "registration-closed";
		if (conflictsLoading) return "loading";
		if (conflicts.length > 0) return "schedule-conflict";
		if (seatsFull) return "waitlist";
		return "form";
	})();

	return {
		state,
		userId,
		participantId: participantId ?? null,
		subscribedIds,
		hasEnded,
		seatsFull,
		conflicts,
		waitlistEntry,
		form,
		hasForm: form.fields.length > 0,
		isResolvingForm: formQuery.isPending,
	};
}
