"use client";

import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { isWithinPeriod } from "@/lib/date";
import { trpc } from "@/lib/trpc/react";

interface ProfileVisitRecorderProps {
	eventUrl: string;
	shortId: string;
	eventStartDate: string;
	eventEndDate: string;
}

/**
 * Registra visita = conexão (viewer -> viewed) uma vez por aba/período.
 * Só dispara p/ logados; anônimos, não-participantes e self-visit são
 * ignorados no servidor. Sem hint `?me`: QR do badge não tem query.
 *
 * O período do evento é checado no cliente, com as datas já entregues pelo
 * shell estático: fora dele nem a sessão é consultada. Isso evita as duas
 * invocações de função (get-session + mutation) por visita antes/depois do
 * evento. O servidor repete a checagem como defesa contra relógio adiantado.
 */
export function ProfileVisitRecorder({
	eventUrl,
	shortId,
	eventStartDate,
	eventEndDate,
}: ProfileVisitRecorderProps) {
	const [isOngoing, setIsOngoing] = useState(false);

	useEffect(() => {
		const update = () => {
			setIsOngoing(isWithinPeriod(eventStartDate, eventEndDate));
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

	if (!isOngoing) return null;

	return <ProfileVisitRecorderInner eventUrl={eventUrl} shortId={shortId} />;
}

function ProfileVisitRecorderInner({
	eventUrl,
	shortId,
}: Pick<ProfileVisitRecorderProps, "eventUrl" | "shortId">) {
	const session = authClient.useSession();
	const userId = session.data?.user.id;
	const { mutateAsync } = trpc.recordProfileVisit.useMutation();

	useEffect(() => {
		if (!userId || session.isPending) return;
		const key = `${eventUrl}:${shortId}:${userId}`;
		const storageKey = `profile-visit:${key}`;
		const now = Date.now();
		const storedAt = Number(sessionStorage.getItem(storageKey));

		// The database write is idempotent, but avoiding the request entirely
		// prevents remounts and repeated navigation from invoking a function.
		if (Number.isFinite(storedAt) && now - storedAt < 10 * 60 * 1000) {
			return;
		}

		sessionStorage.setItem(storageKey, String(now));
		let cancelled = false;
		void mutateAsync({ projectUrl: eventUrl, shortId }).catch(() => {
			// Allow a later visit to retry if the request failed.
			if (!cancelled) sessionStorage.removeItem(storageKey);
		});

		return () => {
			cancelled = true;
		};
	}, [eventUrl, mutateAsync, session.isPending, shortId, userId]);

	return null;
}
