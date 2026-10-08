"use client";

import { useCallback, useRef, useState } from "react";

import { JOIN_ERROR_CODES, type JoinErrorCode } from "@verific/api/schemas";

import {
	revalidateParticipantActivities,
	revalidateSubscribedActivitiesIdsFromParticipant,
} from "@/app/actions";
// API
import { trpc } from "@/lib/trpc/react";

export type JoinError = "form-required" | "full" | "closed" | "unknown";
export type JoinStatus = "idle" | "pending" | "success" | "error";

const REASON_TO_JOIN_ERROR: Record<JoinErrorCode, JoinError> = {
	FORM_REQUIRED: "form-required",
	ACTIVITY_FULL: "full",
	REGISTRATION_CLOSED: "closed",
};

/**
 * Mapeia o erro tRPC para o motivo digitado (`data.reason`, preenchido
 * pelo `errorFormatter` a partir do `cause.code` do servidor). Qualquer
 * coisa fora dos códigos conhecidos — rede, sessão, validação genérica —
 * é `unknown`.
 */
export function toJoinError(error: unknown): JoinError {
	if (typeof error === "object" && error !== null && "data" in error) {
		const reason = (error as { data?: { reason?: unknown } }).data?.reason;
		if (
			typeof reason === "string" &&
			(JOIN_ERROR_CODES as readonly string[]).includes(reason)
		) {
			return REASON_TO_JOIN_ERROR[reason as JoinErrorCode];
		}
	}
	return "unknown";
}

export type JoinAnswers = Record<
	string,
	string | number | boolean | string[] | null | undefined
>;

interface UseJoinActivityArgs {
	activityId: string;
	participantId: string;
	userId: string;
}

export interface UseJoinActivity {
	/**
	 * Inscreve o participante. Retorna o motivo da falha ou `null` no
	 * sucesso (o `status`/`error` também refletem o resultado para a UI).
	 * Nunca dispara duas requisições concorrentes.
	 */
	join: (answers?: JoinAnswers) => Promise<JoinError | null>;
	status: JoinStatus;
	error: JoinError | null;
	reset: () => void;
}

/**
 * Mutação de inscrição compartilhada entre o formulário da página e o
 * quick join: mesma chamada, mesmas revalidações em paralelo (falha de
 * revalidação só é registrada, nunca vira erro de inscrição).
 */
export function useJoinActivity({
	activityId,
	participantId,
	userId,
}: UseJoinActivityArgs): UseJoinActivity {
	const utils = trpc.useUtils();
	const mutation = trpc.addActivityParticipants.useMutation();
	const [status, setStatus] = useState<JoinStatus>("idle");
	const [error, setError] = useState<JoinError | null>(null);
	// Chamadas concorrentes (ex.: duplo clique antes do re-render que
	// desabilita o botão) aguardam a mesma promessa: uma requisição só,
	// mesmo resultado para todos.
	const pendingRef = useRef<Promise<JoinError | null> | null>(null);

	const reset = useCallback(() => {
		setStatus("idle");
		setError(null);
	}, []);

	const join = useCallback(
		async (answers?: JoinAnswers): Promise<JoinError | null> => {
			if (pendingRef.current) return pendingRef.current;
			const run = (async (): Promise<JoinError | null> => {
				setStatus("pending");
				setError(null);

				try {
					await mutation.mutateAsync({
						activityId,
						participantsIdsToAdd: [participantId],
						...(answers ? { formAnswers: { answers } } : {}),
					});
				} catch (err) {
					const joinError = toJoinError(err);
					setError(joinError);
					setStatus("error");
					return joinError;
				}

				const settled = await Promise.allSettled([
					revalidateSubscribedActivitiesIdsFromParticipant(userId),
					revalidateParticipantActivities(userId),
					utils.getSubscribedActivitiesIdsFromParticipant.invalidate(),
					utils.getActivitiesFromParticipant.invalidate(),
				]);
				for (const result of settled) {
					if (result.status === "rejected") {
						console.warn(
							"[join-activity] falha na revalidação pós-inscrição:",
							result.reason,
						);
					}
				}

				setStatus("success");
				return null;
			})();
			pendingRef.current = run;
			try {
				return await run;
			} finally {
				if (pendingRef.current === run) pendingRef.current = null;
			}
		},
		[activityId, participantId, userId, mutation, utils],
	);

	return { join, status, error, reset };
}
