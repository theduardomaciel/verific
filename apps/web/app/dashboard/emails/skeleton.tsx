import { Skeleton } from "@/components/ui/skeleton";

/** Mirror the real component sizes here (shadcn v4 defaults). */
const FILTER_CHIPS = 6;
const TABLE_ROWS = 20; // PAGE_SIZE in content.tsx; clipped by max-h-[70vh]
const ROW_HEIGHT = "h-[57px]"; // py-3 (24) + size="sm" button (32) + border (1)

/** Alert with title + description: py-3 (24) + 20 + 20 + border (2) = 66px.
 *  On mobile the usage bar sits below the text (mt-3 + h-1.5 = +18px). */
export function UsageBannerSkeleton() {
	return <Skeleton className="h-17 w-full rounded-lg sm:h-16.5" />;
}

/** Same wrapper as the real table: max-h-[70vh] + rounded border. */
export function EmailsTableSkeleton() {
	return (
		<div
			className="max-h-[70vh] overflow-hidden rounded-lg border"
			aria-hidden
		>
			<div className="flex h-10 items-center gap-3 border-b px-3">
				<Skeleton className="size-4 shrink-0" />
				<Skeleton className="h-4 w-28 shrink-0" />
				<Skeleton className="h-4 w-12 shrink-0" />
				<Skeleton className="h-4 w-16 shrink-0" />
				<Skeleton className="h-4 w-16 shrink-0" />
				<Skeleton className="h-4 flex-1" />
				<Skeleton className="hidden h-4 w-16 shrink-0 md:block" />
				<Skeleton className="hidden h-4 w-20 shrink-0 lg:block" />
				<Skeleton className="hidden h-4 w-24 shrink-0 lg:block" />
				<Skeleton className="h-4 w-12 shrink-0" />
			</div>
			{Array.from({ length: TABLE_ROWS }).map((_, i) => (
				<div
					key={i}
					className={`flex ${ROW_HEIGHT} items-center gap-3 border-b px-3 last:border-b-0`}
				>
					<Skeleton className="size-4 shrink-0" />
					<Skeleton className="h-4 w-28 shrink-0" />
					<Skeleton className="h-4 w-12 shrink-0" />
					<Skeleton className="h-5 w-16 shrink-0 rounded-full" />
					<Skeleton className="h-4 w-16 shrink-0" />
					<Skeleton className="h-4 flex-1" />
					<Skeleton className="hidden h-4 w-16 shrink-0 md:block" />
					<Skeleton className="hidden h-4 w-20 shrink-0 lg:block" />
					<Skeleton className="hidden h-4 w-24 shrink-0 lg:block" />
					<div className="flex shrink-0 items-center gap-1">
						<Skeleton className="size-8" />
						<Skeleton className="h-8 w-28" />
					</div>
				</div>
			))}
		</div>
	);
}

/** Footer: text-xs (16px) next to size="sm" buttons (32px), mt-4. */
function PaginationSkeleton() {
	return (
		<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<Skeleton className="h-4 w-40" />
			<div className="flex shrink-0 gap-2">
				<Skeleton className="h-8 w-24" />
				<Skeleton className="h-8 w-24" />
			</div>
		</div>
	);
}

export function EmailsSkeleton() {
	return (
		<div
			className="container-d py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col gap-6"
			aria-busy="true"
		>
			{/* Header: h1 text-2xl (32px) + p text-sm (20px), no gap between them */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<Skeleton className="h-8 w-24" />
					<Skeleton className="mt-0 h-5 w-80 max-w-full" />
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Skeleton className="size-9" />
					<Skeleton className="h-9 w-40" />
				</div>
			</div>

			<div>
				<UsageBannerSkeleton />
			</div>

			{/* Search + segmented control (p-0.5 + border + 28px buttons = 34px) */}
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Skeleton className="h-9 w-full sm:max-w-sm" />
					<Skeleton className="h-8.5 w-64 shrink-0 rounded-lg" />
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Skeleton className="mr-1 h-4 w-10" />
					{Array.from({ length: FILTER_CHIPS }).map((_, i) => (
						<Skeleton key={i} className="h-7 w-24 rounded-full" />
					))}
				</div>
			</div>

			<div>
				<EmailsTableSkeleton />
				<PaginationSkeleton />
			</div>
		</div>
	);
}
