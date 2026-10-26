"use client";

import { WaitlistList } from "@/components/participant/waitlist-list";

import { useActivityWaitlist } from "@/hooks/use-activity-waitlist";

interface WaitlistTabProps {
	activityId: string;
	participantsLimit: number | null;
}

export function WaitlistTab({
	activityId,
	participantsLimit,
}: WaitlistTabProps) {
	const {
		data: waitlistData,
		isPending,
		promote,
		remove,
		settle,
		isPromoting,
		isRemoving,
		isSettling,
	} = useActivityWaitlist({
		activityId,
		participantsLimit,
	});

	if (isPending) {
		return (
			<div className="flex w-full flex-col gap-4">
				<div className="bg-muted h-8 w-3/4 animate-pulse rounded" />
				<div className="bg-muted h-8 w-3/4 animate-pulse rounded" />
				<div className="bg-muted h-8 w-3/4 animate-pulse rounded" />
			</div>
		);
	}

	return (
		<WaitlistList
			activityId={activityId}
			waitlistData={waitlistData!}
			promote={promote}
			remove={remove}
			settle={settle}
			isPromoting={isPromoting}
			isRemoving={isRemoving}
			isSettling={isSettling}
		/>
	);
}
