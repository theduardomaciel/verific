import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto do painel de inscrição com as dimensões finais (título,
 * 2–3 campos, botão): sem shift de layout quando os dados resolvem.
 */
export function EnrollmentPanelSkeleton() {
	return (
		<div
			aria-hidden
			className="bg-card flex w-full flex-col gap-4 rounded-lg border p-6"
		>
			<Skeleton className="h-6 w-32" />
			<Skeleton className="h-4 w-full" />
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="flex flex-col gap-2">
					<Skeleton className="h-4 w-36" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="flex flex-col gap-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-16 w-full" />
				</div>
			</div>
			<Skeleton className="h-11 w-full" />
		</div>
	);
}

/**
 * Fallback do `<Suspense>` da rota: espelha o layout de duas colunas
 * (detalhes + painel) para o rodapé nunca subir.
 */
export function ActivityPageSkeleton() {
	return (
		<div aria-hidden className="container-p w-full">
			<Skeleton className="mb-4 h-9 w-56" />
			<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-12">
				<div className="flex w-full flex-col gap-6">
					<div className="flex items-start justify-between gap-4">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-5 w-28" />
					</div>
					<Skeleton className="h-10 w-3/4" />
					<div className="flex flex-wrap gap-1.5">
						<Skeleton className="h-6 w-20 rounded-full" />
						<Skeleton className="h-6 w-24 rounded-full" />
					</div>
					<div className="flex flex-wrap gap-2">
						<Skeleton className="h-7 w-44" />
						<Skeleton className="h-7 w-36" />
					</div>
					<Skeleton className="h-5 w-40" />
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-20 w-full" />
					</div>
					<Skeleton className="h-5 w-48" />
					<div className="flex flex-col gap-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				</div>
				<EnrollmentPanelSkeleton />
			</div>
		</div>
	);
}
