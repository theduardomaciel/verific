import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Calendar } from "lucide-react";

import * as EventContainer from "@/components/landing/event-container";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscribeGate } from "@/components/subscribe-gate";

import { getEventRegistration, getProject } from "@/lib/data";

/**
 * Checks (`getProject`/`getEventRegistration` + `notFound`/`redirect`)
 * run here, before any `<Suspense>` boundary renders — real 404/redirect
 * statuses instead of streamed soft-404s. Both reads are cached
 * ("use cache"), so the gate itself still prerenders.
 */
export default async function EventSubscribePage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;
	const result = await getProject(eventUrl);

	if (!result?.project) {
		notFound();
	}

	const { project } = result;
	const registration = await getEventRegistration(eventUrl);

	if (!registration?.isRegistrationEnabled) {
		redirect(`/${eventUrl}`);
	}

	return (
		<Suspense fallback={<SubscribePageFallback />}>
			<EventContainer.Holder>
				<EventContainer.Hero
					coverUrl={project.coverUrl || "/images/hero-bg.png"}
				>
					<div className="z-10 flex flex-1 flex-col items-center justify-center">
						<h1 className="font-heading mb-4 text-center text-5xl font-bold text-white">
							Inscreva-se em <br />
							{project.name}
						</h1>
						<div className="mb-4 flex items-center text-lg text-white/90">
							<Calendar className="mr-2 h-4.5 w-4.5" />
							<span className="-mt-0.5 text-base">
								De{" "}
								{new Date(project.startDate).toLocaleDateString(
									"pt-BR",
								)}{" "}
								a{" "}
								{new Date(project.endDate).toLocaleDateString(
									"pt-BR",
								)}
							</span>
						</div>
					</div>
				</EventContainer.Hero>
				<EventContainer.Content>
					<div className="container-p w-full">
						<SubscribeGate
							project={{
								id: project.id,
								url: project.url,
								name: project.name,
								logo: project.logoUrl || undefined,
								colors: [
									project.primaryColor,
									project.secondaryColor,
								].filter(Boolean) as string[],
							}}
						/>
					</div>
				</EventContainer.Content>
			</EventContainer.Holder>
		</Suspense>
	);
}

/**
 * Esqueleto em tamanho real da inscrição: espelha o Hero (py-24) e o
 * `SubscribeSkeleton` do gate para que o rodapé não suba enquanto o
 * shell estático resolve.
 */
function SubscribePageFallback() {
	return (
		<EventContainer.Holder>
			<section className="relative flex w-full overflow-hidden py-24">
				<div className="container-p z-10 mx-auto flex w-full flex-col items-center gap-4">
					<Skeleton className="h-12 w-full max-w-xl" />
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
