"use client";

import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";

/**
 * Registra visita = conexão (viewer -> viewed) uma vez por aba/período.
 * Só dispara p/ logados; anônimos, não-participantes e self-visit são
 * ignorados no servidor. Sem hint `?me`: QR do badge não tem query.
 */
export function ProfileVisitRecorder({
	eventUrl,
	shortId,
}: {
	eventUrl: string;
	shortId: string;
}) {
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
