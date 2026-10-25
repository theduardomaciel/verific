"use client";

import { WaitlistList } from "@/components/participant/waitlist-list";

import { trpc } from "@/lib/trpc/react";

interface WaitlistTabProps {
	activityId: string;
	participantsLimit: number | null;
}

export function WaitlistTab({
	activityId,
	participantsLimit,
}: WaitlistTabProps) {
	const { data: waitlistData, isPending } = trpc.getActivityWaitlist.useQuery(
		{ activityId },
		{
			enabled: !!participantsLimit,
			staleTime: 30 * 1000,
			refetchOnWindowFocus: true,
		},
	);

	if (isPending) {
		return (
			<div className="flex w-full flex-col gap-4">
				<div className="bg-muted h-8 w-3/4 animate-pulse rounded" />
				<div className="bg-muted h-8 w-3/4 animate-pulse rounded" />
				<div className="bg-muted h-8 w-3/4 animate-pulse rounded" />
			</div>
		);
	}

	return <WaitlistList activityId={activityId} />;
}
