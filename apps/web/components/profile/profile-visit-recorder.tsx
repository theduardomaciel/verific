"use client";

import { useEffect, useRef, useState } from "react";

import { isWithinPeriod } from "@/lib/date";
import { hasSessionMarker } from "@/lib/session-marker";
import { trpc } from "@/lib/trpc/react";

interface ProfileVisitRecorderProps {
	projectId: string;
	shortId: string;
	eventStartDate: string;
	eventEndDate: string;
}

// Memória do módulo (por aba, sobrevive à navegação do cliente): uma visita
// já registrada não volta a chamar a função dentro da mesma janela de
// deduplicação; uma requisição em voo também não é duplicada por
// remontagem/StrictMode. Sem `sessionStorage`: o custo de uma nova visita
// após reload é idempotente no banco.
const VISIT_DEDUPE_MS = 10 * 60 * 1000;
const recordedVisits = new Map<string, number>();
const visitsInFlight = new Set<string>();

function visitKey(projectId: string, shortId: string) {
	return `${projectId}:${shortId}`;
}

/**
 * Registra visita = conexão (viewer -> viewed) em uma única chamada.
 *
 * A mutation pública lê a sessão no servidor: não existe mais o
 * `/api/auth/get-session` antes dela. Anônimos, não-participantes e
 * self-visit são ignorados no servidor. O QR do badge não traz `?me`;
 * o marcador de sessão evita a chamada para quem nem está logado.
 *
 * O período do evento é checado no cliente, com as datas já entregues pelo
 * shell estático: fora dele nada é chamado. O servidor repete a checagem
 * como defesa contra relógio adiantado.
 */
export function ProfileVisitRecorder({
	projectId,
	shortId,
	eventStartDate,
	eventEndDate,
}: ProfileVisitRecorderProps) {
	const [canRecord, setCanRecord] = useState(false);

	useEffect(() => {
		const update = () => {
			setCanRecord(
				isWithinPeriod(eventStartDate, eventEndDate) &&
					hasSessionMarker(),
			);
		};
		update();

		// Reavalia na virada (abertura ou encerramento) para uma aba deixada
		// aberta não ficar com o estado errado durante todo o evento.
		const start = new Date(eventStartDate).getTime();
		const end = new Date(eventEndDate).getTime();
		const now = Date.now();
		const nextBoundary = now < start ? start : now <= end ? end : null;
		if (nextBoundary === null) return;

		const timer = setTimeout(
			update,
			Math.min(nextBoundary - now + 1000, 2_147_483_647),
		);
		return () => clearTimeout(timer);
	}, [eventEndDate, eventStartDate]);

	// Sem marcador não há sessão provável: não gasta a invocação. Sessões
	// anteriores ao deploy só voltam a registrar após um novo login.
	if (!canRecord) return null;

	return (
		<ProfileVisitRecorderInner projectId={projectId} shortId={shortId} />
	);
}

function ProfileVisitRecorderInner({
	projectId,
	shortId,
}: Pick<ProfileVisitRecorderProps, "projectId" | "shortId">) {
	const { mutateAsync } = trpc.recordProfileVisit.useMutation();
	const requestedKey = useRef<string | null>(null);

	useEffect(() => {
		const key = visitKey(projectId, shortId);
		// Exatamente uma tentativa por montagem (e por perfil, caso a
		// mesma instância seja reutilizada numa navegação).
		if (requestedKey.current === key) return;
		requestedKey.current = key;

		const recordedAt = recordedVisits.get(key);
		if (
			(recordedAt !== undefined &&
				Date.now() - recordedAt < VISIT_DEDUPE_MS) ||
			visitsInFlight.has(key)
		) {
			return;
		}

		visitsInFlight.add(key);
		void mutateAsync({ projectId, shortId })
			.then((result) => {
				// Só marca como concluída quando o servidor realmente gravou.
				// Visita anônima (`recorded: false`) pode tentar de novo depois
				// de um login, sem perder a primeira visita registrada.
				if (result.recorded) recordedVisits.set(key, Date.now());
			})
			.catch(() => {
				// Permite nova tentativa numa próxima montagem.
			})
			.finally(() => {
				visitsInFlight.delete(key);
			});
	}, [mutateAsync, projectId, shortId]);

	return null;
}
