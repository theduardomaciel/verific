"use client";

import { trpc } from "@/lib/trpc/react";

import { usePublicSession } from "./use-public-session";

export function useSubscribedActivities(eventUrl: string) {
	const session = usePublicSession();
	const userId = session.data?.user.id;

	const subscribedQuery = trpc.getMyEnrollmentState.useQuery(
		{ projectUrl: eventUrl, clientSessionId: userId },
		{
			enabled: Boolean(userId),
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false,
		},
	);

	return {
		userId,
		subscribedIds: subscribedQuery.data?.activityIds,
		participantId: subscribedQuery.data?.participantId,
		isPending:
			session.isPending || (Boolean(userId) && subscribedQuery.isPending),
	};
}
