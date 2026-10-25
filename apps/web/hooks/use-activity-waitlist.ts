"use client";

import { trpc } from "@/lib/trpc/react";

interface UseActivityWaitlistArgs {
	activityId: string;
	participantsLimit: number | null;
}

/**
 * Fila de espera da atividade para organizadores.
 *
 * Segue o padrão do dashboard: staleTime de 2 minutos, sem refetch
 * em foco de janela, gcTime de 30 minutos (padrão do cliente).
 * A query é protegida (requer acesso de organizador) e não é cacheada
 * na borda (edge), apenas no React Query do cliente.
 */
export function useActivityWaitlist({
	activityId,
	participantsLimit,
}: UseActivityWaitlistArgs) {
	const utils = trpc.useUtils();

	const query = trpc.getActivityWaitlist.useQuery(
		{ activityId },
		{
			enabled: !!participantsLimit,
			staleTime: 2 * 60 * 1000,
			gcTime: 30 * 60 * 1000,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
		},
	);

	const promoteMutation = trpc.promoteFromWaitlist.useMutation({
		onSuccess: () => {
			void utils.getActivityWaitlist.invalidate({ activityId });
		},
	});

	const removeMutation = trpc.removeFromWaitlist.useMutation({
		onSuccess: () => {
			void utils.getActivityWaitlist.invalidate({ activityId });
		},
	});

	return {
		...query,
		promote: promoteMutation.mutateAsync,
		remove: removeMutation.mutateAsync,
		isPromoting: promoteMutation.isPending,
		isRemoving: removeMutation.isPending,
	};
}
