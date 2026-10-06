"use client";

import { useEffect, useRef } from "react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";

/**
 * Registra visita = conexão (viewer -> viewed) uma vez por montagem.
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
	const mutate = trpc.recordProfileVisit.useMutation();
	const fired = useRef<string | null>(null);

	useEffect(() => {
		if (!userId || session.isPending) return;
		const key = `${eventUrl}:${shortId}:${userId}`;
		if (fired.current === key) return;
		fired.current = key;
		mutate.mutate({ projectUrl: eventUrl, shortId });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [eventUrl, shortId, userId]);

	return null;
}
