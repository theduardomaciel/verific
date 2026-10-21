"use client";

import { useMemo } from "react";

import { normalizeActivityIds } from "@/lib/activity-availability";
import { trpc } from "@/lib/trpc/react";

interface UseActivityAvailabilityArgs {
	projectId: string;
	activityIds: string[];
}

/**
 * Contagens voláteis (inscritos + ofertas) fora do shell estático.
 *
 * O HTML cacheado entra com a contagem do build/última invalidação; esta
 * query pública (`s-maxage=60` no handler) corrige o valor depois da
 * hidratação. O valor cacheado continua sendo o fallback de primeiro paint,
 * então não há skeleton nem salto de layout.
 *
 * A chave é normalizada (ids únicos e ordenados) para o React Query não
 * disparar uma query nova a cada render por identidade de array.
 */
export function useActivityAvailability({
	projectId,
	activityIds,
}: UseActivityAvailabilityArgs) {
	const idsKey = useMemo(
		() => normalizeActivityIds(activityIds).join(","),
		[activityIds],
	);
	const ids = useMemo(
		() => (idsKey.length > 0 ? idsKey.split(",") : []),
		[idsKey],
	);
	const input = useMemo(
		() => ({ projectId, activityIds: ids }),
		[projectId, ids],
	);

	const query = trpc.getActivityAvailability.useQuery(input, {
		enabled: ids.length > 0,
		staleTime: 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchOnWindowFocus: true,
	});

	const byActivity = useMemo(
		() =>
			new Map(
				(query.data ?? []).map((row) => [row.activityId, row] as const),
			),
		[query.data],
	);

	return {
		byActivity,
		isPending: query.isPending,
	};
}
