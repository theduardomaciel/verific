import { Skeleton } from "@/components/ui/skeleton";

export function SettingsFormSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-44 w-full" />
			<Skeleton className="h-44 w-full" />
			<Skeleton className="h-44 w-full" />
		</div>
	);
}
