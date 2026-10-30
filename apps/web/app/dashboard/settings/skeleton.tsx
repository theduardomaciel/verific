import { Skeleton } from "@/components/ui/skeleton";

export function SettingsShellSkeleton() {
	return (
		<main className="container-d py-container-v relative mx-auto min-h-[calc(100dvh-var(--dashboard-header-height))]">
			<h1 className="text-foreground mb-8 text-3xl font-bold">
				Configurações
			</h1>
			<div className="flex h-full flex-col gap-8 md:flex-row">
				<div className="flex w-full shrink-0 flex-col gap-2 md:w-64">
					{Array.from({ length: 6 }, (_, i) => (
						<Skeleton key={i} className="h-9 w-full" />
					))}
				</div>
				<div className="min-w-0 flex-1">
					<SettingsFormSkeleton />
				</div>
			</div>
		</main>
	);
}

export function SettingsFormSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-44 w-full" />
			<Skeleton className="h-44 w-full" />
			<Skeleton className="h-44 w-full" />
		</div>
	);
}
