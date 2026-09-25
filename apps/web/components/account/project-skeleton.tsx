import { Skeleton } from "@/components/ui/skeleton";

export function AccountProjectsSkeleton() {
	return (
		<div className="flex w-full max-w-md flex-col px-4">
			<Skeleton className="mx-auto mb-6 h-8 w-56" />
			<div className="flex w-full flex-col gap-4 p-3 md:rounded-lg md:border md:p-6">
				<Skeleton className="h-10 w-full" />
				<div className="flex flex-col items-center gap-3">
					{Array.from({ length: 3 }).map((_, index) => (
						<Skeleton key={index} className="h-20 w-full" />
					))}
				</div>
				<Skeleton className="h-10 w-full" />
			</div>
		</div>
	);
}

export function AccountHeaderSkeleton() {
	return <div className="min-h-[68px] w-full border-b" aria-hidden />;
}
