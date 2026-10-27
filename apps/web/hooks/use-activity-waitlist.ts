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
		onSuccess: (_data, vars) => {
			// Atualização otimista: remove da fila e incrementa inscritos.
			utils.getActivityWaitlist.setQueriesData(
				{ activityId },
				{},
				(previous) => {
					if (!previous) return previous;
					const promoted = new Set(vars.participantIds);
					const entries = previous.entries.filter(
						(entry) => !promoted.has(entry.participantId),
					);
					const removedCount =
						previous.entries.length - entries.length;
					if (removedCount === 0) return previous;
					return {
						...previous,
						entries,
						enrolled: previous.enrolled + removedCount,
						freeSeats:
							previous.freeSeats != null
								? Math.max(0, previous.freeSeats - removedCount)
								: null,
					};
				},
			);
			void utils.getActivityWaitlist.invalidate({ activityId });
		},
	});

	const removeMutation = trpc.removeFromWaitlist.useMutation({
		onSuccess: (_data, vars) => {
			// Atualização otimista: remove da fila.
			utils.getActivityWaitlist.setQueriesData(
				{ activityId },
				{},
				(previous) => {
					if (!previous) return previous;
					const entries = previous.entries.filter(
						(entry) => entry.participantId !== vars.participantId,
					);
					if (entries.length === previous.entries.length) {
						return previous;
					}
					return { ...previous, entries };
				},
			);
			void utils.getActivityWaitlist.invalidate({ activityId });
		},
	});

	const settleMutation = trpc.settleActivityWaitlist.useMutation({
		onSuccess: () => {
			void utils.getActivityWaitlist.invalidate({ activityId });
		},
	});

	return {
		...query,
		promote: (args: {
			activityId: string;
			participantIds: string[];
			reason?: string;
			allowOverCapacity?: boolean;
		}) => promoteMutation.mutateAsync(args) as unknown as Promise<void>,
		remove: (args: {
			activityId: string;
			participantId: string;
			reason?: string;
		}) => removeMutation.mutateAsync(args) as unknown as Promise<void>,
		settle: (args: { activityId: string }) =>
			settleMutation.mutateAsync(args) as unknown as Promise<void>,
		isPromoting: promoteMutation.isPending,
		isRemoving: removeMutation.isPending,
		isSettling: settleMutation.isPending,
	};
}
