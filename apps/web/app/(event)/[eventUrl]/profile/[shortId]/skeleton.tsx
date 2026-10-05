import * as EventContainer from "@/components/landing/event-container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto em tamanho real do perfil: mesmos contêineres e alturas do
 * conteúdo final (banner h-96, stats h-40, tickets min-h-64) para que o
 * rodapé do layout não suba para o topo enquanto o shell resolve.
 */
export function ProfilePageSkeleton() {
	return (
		<EventContainer.Holder>
			<EventContainer.Content>
				<div className="container-p mb-8 flex min-h-[60vh] w-full flex-col gap-4 md:gap-12">
					<Skeleton className="h-96 w-full rounded-3xl" />
					<Skeleton className="h-40 w-full rounded-3xl" />
					<Skeleton className="min-h-64 w-full rounded-3xl" />
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
