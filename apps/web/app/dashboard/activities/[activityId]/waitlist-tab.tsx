"use client";

import { Skeleton } from "@/components/ui/skeleton";

import { WaitlistList } from "@/components/participant/waitlist-list";

import { useActivityWaitlist } from "@/hooks/use-activity-waitlist";
import { cn } from "@/lib/utils";

interface WaitlistTabProps {
	activityId: string;
	participantsLimit: number | null;
}

// Keep in sync with ROW_GRID in waitlist-list.tsx
const ROW_GRID =
	"lg:grid lg:grid-cols-[2.5rem_minmax(0,1fr)_7rem_9rem_15rem] lg:items-center lg:gap-3";

const SKELETON_ROWS = 5;

function WaitlistListSkeleton() {
	return (
		<div
			className="flex w-full min-w-0 flex-col gap-4"
			aria-busy="true"
			aria-label="Carregando fila de espera"
		>
			{/* Summary Cards */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
				{Array.from({ length: 5 }).map((_, i) => (
					<div
						key={i}
						className="bg-card flex min-w-0 flex-col gap-2 rounded-lg border p-4"
					>
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-8 w-12" />
					</div>
				))}
			</div>

			<div className="w-full min-w-0">
				{/* Column headers (desktop only) */}
				<div className={cn("hidden border-b pb-3", ROW_GRID)}>
					<Skeleton className="h-4 w-3" />
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-4 w-28" />
					<Skeleton className="ml-auto h-4 w-12" />
				</div>

				<ul className="w-full divide-y">
					{Array.from({ length: SKELETON_ROWS }).map((_, i) => (
						<li
							key={i}
							className={cn(
								"flex flex-col gap-3 py-4 lg:py-3",
								ROW_GRID,
							)}
						>
							{/* Position (desktop) */}
							<Skeleton className="hidden h-4 w-4 lg:block" />

							{/* Participant (+ status badge on mobile) */}
							<div className="flex min-w-0 items-start gap-3 lg:items-center">
								<Skeleton className="h-8 w-8 shrink-0 rounded-full" />
								<div className="flex min-w-0 flex-1 flex-col gap-1.5">
									<Skeleton className="h-4 w-40 max-w-full" />
									<Skeleton className="h-3 w-52 max-w-full" />
									<Skeleton className="mt-1 h-5 w-20 rounded-full lg:hidden" />
								</div>
							</div>

							{/* Status (desktop) */}
							<Skeleton className="hidden h-5 w-20 rounded-full lg:block" />

							{/* Joined date */}
							<Skeleton className="h-4 w-32" />

							{/* Actions */}
							<div className="flex items-center gap-2 lg:justify-end">
								<Skeleton className="h-8 flex-1 lg:w-20 lg:flex-none" />
								<Skeleton className="h-8 flex-1 lg:w-28 lg:flex-none" />
							</div>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
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

	if (isPending || !waitlistData) {
		return <WaitlistListSkeleton />;
	}

	return (
		<WaitlistList
			activityId={activityId}
			waitlistData={waitlistData}
			promote={promote}
			remove={remove}
			settle={settle}
			isPromoting={isPromoting}
			isRemoving={isRemoving}
			isSettling={isSettling}
		/>
	);
}
