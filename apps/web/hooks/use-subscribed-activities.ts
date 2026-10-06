"use client";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";

export function useSubscribedActivities(eventUrl: string) {
	const session = authClient.useSession();
	const userId = session.data?.user.id;

	const subscribedQuery =
		trpc.getSubscribedActivitiesIdsFromParticipant.useQuery(
			{ projectUrl: eventUrl },
			{
				enabled: Boolean(userId),
				staleTime: 60 * 1000,
				gcTime: 10 * 60 * 1000,
				refetchOnWindowFocus: false,
			},
		);

	return {
		userId,
		subscribedIds: subscribedQuery.data?.ids,
		participantId: subscribedQuery.data?.participantId,
		isPending:
			session.isPending || (Boolean(userId) && subscribedQuery.isPending),
	};
}
