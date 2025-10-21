import { Skeleton } from "@/components/ui/skeleton";

export default function ScheduleLoading() {
	return (
		<div className="container-p mb-8 flex flex-col justify-center gap-4">
			<div className="flex w-full flex-row items-center justify-center gap-4">
				<Skeleton className="h-9 flex-3/4 rounded" />
				<Skeleton className="h-9 w-24 rounded" />
				<Skeleton className="h-9 w-24 rounded" />
			</div>
			<div className="flex flex-col gap-6 md:grid md:grid-cols-2">
				{Array.from({ length: 4 }).map((_, index) => (
					<div
						key={index}
						className="border-accent flex flex-col gap-4 rounded-md border p-6"
					>
						<Skeleton className="h-6 w-3/4 rounded" />
						<Skeleton className="h-4 w-1/2 rounded" />
						<Skeleton className="h-4 w-full rounded" />
						<Skeleton className="h-4 w-5/6 rounded" />
					</div>
				))}
			</div>
		</div>
	);
}
