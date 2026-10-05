import * as EventContainer from "@/components/landing/event-container";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleLoading } from "./content-skeleton";

/**
 * Esqueleto em tamanho real da programação: espelha o Hero
 * (data + título + descrição) e reutiliza o `ScheduleLoading` do
 * conteúdo, para que o rodapé nunca suba para o espaço em branco.
 */
export function SchedulePageSkeleton() {
	return (
		<EventContainer.Holder>
			<section className="relative flex w-full overflow-hidden py-24">
				<div className="container-p z-10 mx-auto flex w-full flex-col gap-8 md:flex-row">
					<div className="z-10 flex flex-1 flex-col items-start justify-center">
						<Skeleton className="mb-4 h-6 w-64" />
						<Skeleton className="mb-4 h-12 w-72" />
						<Skeleton className="mb-2 h-5 w-full max-w-md" />
						<Skeleton className="h-5 w-2/3 max-w-md" />
					</div>
				</div>
			</section>
			<EventContainer.Content>
				<ScheduleLoading />
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
