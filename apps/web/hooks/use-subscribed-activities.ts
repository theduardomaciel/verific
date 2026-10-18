"use client";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";

export function useSubscribedActivities(eventUrl: string) {
	const session = authClient.useSession();
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
