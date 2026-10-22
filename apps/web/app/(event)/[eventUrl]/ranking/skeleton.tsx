import { Skeleton } from "@/components/ui/skeleton";

import * as EventContainer from "@/components/landing/event-container";

export function RankingPageSkeleton() {
	return (
		<EventContainer.Holder>
			<div className="container-p pt-24 pb-8">
				<Skeleton className="h-10 w-52" />
				<Skeleton className="mt-3 h-5 w-80 max-w-full" />
			</div>
			<EventContainer.Content className="container-p">
				<div className="flex w-full flex-col gap-10">
					<div className="flex flex-row items-end justify-center gap-3">
						<Skeleton className="h-48 flex-1 rounded-xl" />
						<Skeleton className="h-56 flex-1 rounded-xl" />
						<Skeleton className="h-44 flex-1 rounded-xl" />
					</div>
					<div className="flex flex-col gap-2">
						{Array.from({ length: 6 }, (_, index) => (
							<Skeleton
								key={index}
								className="h-16 w-full rounded-2xl"
							/>
						))}
					</div>
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
