import { Skeleton } from "@/components/ui/skeleton";

import * as EventContainer from "@/components/landing/event-container";

/**
 * Esqueleto em tamanho real da página do evento: espelha o Hero
 * (py-24: título text-5xl, data, badges, CTA h-12, thumbnail h-60) e o
 * conteúdo em duas colunas, para que o rodapé nunca suba para o
 * espaço em branco durante navegação client-side ou render on-demand.
 *
 * O Hero reusa `EventContainer.Hero` (sem imagem) em vez de repetir a
 * `section` à mão: assim `py-24`, o container interno e o gradiente
 * `--ev-hero-bg` — esticado em `-HEADER_H`, casando com o `h-21` do header —
 * seguem de uma única fonte e não divergem do Hero real.
 */
export function EventPageSkeleton() {
	return (
		<EventContainer.Holder>
			<EventContainer.Hero showImage={false}>
				<div className="z-10 flex flex-1 flex-col items-start justify-center">
					<Skeleton className="mb-4 h-12 w-3/4" />
					<Skeleton className="mb-6 h-6 w-64" />
					<div className="mb-8 flex flex-wrap gap-3">
						<Skeleton className="h-7 w-63 rounded-xl" />
						<Skeleton className="h-7 w-44 rounded-xl" />
					</div>
					<Skeleton className="h-12 w-45.5" />
				</div>
				<div className="relative z-20 flex h-60 items-center justify-center">
					{/* Mesma largura intrínseca da imagem real (400px). */}
					<Skeleton className="h-60 w-100 rounded-3xl" />
				</div>
			</EventContainer.Hero>
			<EventContainer.Content>
				<div className="container-p relative mx-auto flex min-h-[50vh] flex-col gap-16 lg:flex-row">
					<div className="lg:w-2/3">
						<Skeleton className="mb-6 h-8 w-64" />
						{/* `prose-lg`: linhas de 18px com line-height ~32px. */}
						<div className="space-y-4">
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
						{/* `ReportEventDialog`: outline `lg` (h-10), `mt-4` e
						    largura cheia abaixo de `lg`. */}
						<span className="flex w-full items-end justify-end">
							<Skeleton className="mt-4 h-10 w-56 max-lg:w-full" />
						</span>
					</div>
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
