import * as EventContainer from "@/components/landing/event-container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto em tamanho real da inscrição: espelha o Hero (py-24,
 * título em duas linhas text-5xl + data) e o `SubscribeSkeleton` do
 * gate, para que o rodapé não suba enquanto o shell resolve.
 */
export function SubscribePageSkeleton() {
	return (
		<EventContainer.Holder>
			<section className="relative flex w-full overflow-hidden py-[6.45rem]">
				<div className="container-p z-10 mx-auto flex w-full flex-col items-center gap-4">
					<Skeleton className="h-24 w-full max-w-xl" />
					<Skeleton className="h-6 w-64" />
				</div>
			</section>
			<EventContainer.Content>
				<div className="container-p w-full">
					<div className="flex min-h-[50vh] w-full flex-col gap-6">
						<Skeleton className="h-40 w-full" />
						<Skeleton className="h-64 w-full" />
					</div>
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
