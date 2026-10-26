"use client";

import { useSyncExternalStore } from "react";

import { useQuery } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { hasSessionMarker } from "@/lib/session-marker";

const subscribe = () => () => {};

/**
 * Sessão para as páginas públicas: sem o marcador de sessão, o visitante é
 * anônimo e não há chamada a `/api/auth/get-session`. No servidor e na
 * hidratação fica pendente, como o `useSession`.
 */
export function usePublicSession() {
	const marked = useSyncExternalStore(
		subscribe,
		hasSessionMarker,
		() => null,
	);
	const query = useQuery({
		queryKey: ["public-session"],
		queryFn: async () => (await authClient.getSession()).data ?? null,
		enabled: marked === true,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});

	if (marked === false) return { data: null, isPending: false };
	return { data: query.data ?? null, isPending: query.isPending };
}
