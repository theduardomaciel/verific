"use client";

import { useCallback, useState } from "react";

import {
	revalidateParticipantActivities,
	revalidateSubscribedActivitiesIdsFromParticipant,
} from "@/app/actions";
import { toJoinError, type JoinAnswers } from "@/hooks/use-join-activity";
// API
import { trpc } from "@/lib/trpc/react";

export type WaitlistAction = "join" | "leave" | "confirm";

interface UseWaitlistArgs {
	activityId: string;
	userId: string;
}

/**
 * Ações da fila de espera da atividade. Depois de cada uma, atualiza a
 * fila, as inscrições e os caches do servidor, como a inscrição direta.
 */
export function useWaitlist({ activityId, userId }: UseWaitlistArgs) {
	const utils = trpc.useUtils();
	const joinMutation = trpc.joinActivityWaitlist.useMutation();
	const leaveMutation = trpc.leaveActivityWaitlist.useMutation();
	const confirmMutation = trpc.confirmWaitlistOffer.useMutation();
	const [pending, setPending] = useState<WaitlistAction | null>(null);

	const refresh = useCallback(async () => {
		const settled = await Promise.allSettled([
			revalidateSubscribedActivitiesIdsFromParticipant(userId),
			revalidateParticipantActivities(userId),
			utils.getMyWaitlistEntries.invalidate(),
			utils.getSubscribedActivitiesIdsFromParticipant.invalidate(),
			utils.getActivitiesFromParticipant.invalidate(),
		]);
		for (const result of settled) {
			if (result.status === "rejected") {
				console.warn("[waitlist] falha na revalidação:", result.reason);
			}
		}
	}, [userId, utils]);

	const run = useCallback(
		async <T>(action: WaitlistAction, call: () => Promise<T>) => {
			setPending(action);
			try {
				const result = await call();
				await refresh();
				return { result, error: null };
			} catch (err) {
				// A fila pode ter mudado (oferta vencida, vaga ocupada)
				await refresh();
				return { result: null, error: toJoinError(err) };
			} finally {
				setPending(null);
			}
		},
		[refresh],
	);

	/** Entra na fila; com vaga livre e ninguém esperando, inscreve direto. */
	const join = useCallback(
		(answers?: JoinAnswers) =>
			run("join", () =>
				joinMutation.mutateAsync({
					activityId,
					...(answers ? { formAnswers: { answers } } : {}),
				}),
			),
		[activityId, joinMutation, run],
	);

	const leave = useCallback(
		() => run("leave", () => leaveMutation.mutateAsync({ activityId })),
		[activityId, leaveMutation, run],
	);

	const confirm = useCallback(
		() => run("confirm", () => confirmMutation.mutateAsync({ activityId })),
		[activityId, confirmMutation, run],
	);

	return { join, leave, confirm, pending };
}
