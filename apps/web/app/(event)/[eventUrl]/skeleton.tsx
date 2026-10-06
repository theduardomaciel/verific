import * as EventContainer from "@/components/landing/event-container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto em tamanho real da página do evento: espelha o Hero
 * (py-24: título text-5xl, data, badges, CTA h-12, thumbnail h-60) e o
 * conteúdo em duas colunas, para que o rodapé nunca suba para o
 * espaço em branco durante navegação client-side ou render on-demand.
 */
export function EventPageSkeleton() {
	return (
		<EventContainer.Holder>
			<section className="relative flex w-full overflow-hidden py-24">
				<div className="container-p z-10 mx-auto flex w-full flex-col gap-8 md:flex-row">
					<div className="z-10 flex flex-1 flex-col items-start justify-center">
						<Skeleton className="mb-4 h-12 w-3/4" />
						<Skeleton className="mb-6 h-6 w-64" />
						<div className="mb-8 flex flex-wrap gap-3">
							<Skeleton className="h-6 w-52 rounded-xl" />
							<Skeleton className="h-6 w-44 rounded-xl" />
						</div>
						<Skeleton className="h-12 w-44" />
					</div>
					<div className="relative z-20 flex h-60 items-center justify-center">
						<Skeleton className="h-60 w-full max-w-md rounded-3xl" />
					</div>
				</div>
			</section>
			<EventContainer.Content>
				<div className="container-p relative mx-auto flex min-h-[50vh] flex-col gap-16 lg:flex-row">
					<div className="lg:w-2/3">
						<Skeleton className="mb-6 h-8 w-64" />
						<div className="space-y-3">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					</div>
					<div className="lg:w-1/3">
						<Skeleton className="mb-6 min-h-96 w-full rounded-(--ev-card-radius,1.5rem)" />
						<Skeleton className="min-h-44 w-full rounded-(--ev-card-radius,1.5rem)" />
					</div>
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
