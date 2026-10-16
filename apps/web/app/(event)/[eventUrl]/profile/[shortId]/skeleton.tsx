import { Skeleton } from "@/components/ui/skeleton";

import * as EventContainer from "@/components/landing/event-container";

/**
 * Esqueleto em tamanho real do perfil: mesmos contêineres e alturas do
 * conteúdo final (banner com avatar + nome, stats `h-40`, tickets
 * `min-h-64`) para que o rodapé do layout não suba para o topo enquanto o
 * shell resolve — `h-40`/`min-h-64` espelham os fallbacks das ilhas.
 *
 * O banner espelha a estrutura do `ProfileBanner` (avatar `h-24 md:h-28`,
 * título `text-3xl`, subtítulo `text-lg`) em vez de um bloco `h-96` chapado:
 * o `md:h-96` real só existe quando há bio, então o bloco fixo exagerava a
 * altura em perfis sem bio. Perfis com bio ainda diferem no desktop.
 */
export function ProfilePageSkeleton() {
	return (
		<EventContainer.Holder>
			<EventContainer.Content>
				<div className="container-p mb-8 flex min-h-[60vh] w-full flex-col gap-4 md:gap-12">
					<header className="relative flex w-full flex-col items-start justify-start gap-4 overflow-hidden rounded-3xl p-8">
						<div className="relative z-10 flex w-full flex-col items-start gap-4">
							<Skeleton className="h-24 w-24 rounded-full md:h-28 md:w-28" />
							<div className="flex flex-col items-start justify-start gap-2">
								<Skeleton className="h-9 w-64" />
								<Skeleton className="h-7 w-40" />
							</div>
						</div>
					</header>
					<Skeleton className="h-40 w-full rounded-3xl" />
					<Skeleton className="min-h-64 w-full rounded-3xl" />
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
