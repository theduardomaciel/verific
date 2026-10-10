import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Calendar } from "lucide-react";

import { parseEventTheme } from "@verific/drizzle/theme";

import * as EventContainer from "@/components/landing/event-container";
import { SubscribeGate } from "@/components/subscribe-gate";

import {
	getEventRegistration,
	getEventStaticParams,
	getProject,
} from "@/lib/data";

import { SubscribePageSkeleton } from "./skeleton";

/**
 * Exige saída estática completa (nível `navigation`): o build falha se
 * alguém introduzir `cookies()`, `headers()` ou dado não cacheado nesta
 * rota — mantém a página de inscrição servida pela CDN sob carga pública.
 */
export const ensureStatic = "navigation";

export async function generateStaticParams() {
	return getEventStaticParams();
}

// Mesmo padrão das páginas irmãs (`[eventUrl]`, `schedule`): gate
// `notFound`/`redirect` real antes de qualquer `<Suspense>` sobre dados
// 100% específicos da URL — opta por navegação com bloqueio.
export const instant = false;

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

	const theme = parseEventTheme({
		theme: (project as { theme?: unknown }).theme,
		primaryColor: project.primaryColor,
		secondaryColor: project.secondaryColor,
	});

	return (
		<Suspense fallback={<SubscribePageSkeleton />}>
			<EventContainer.Holder>
				<EventContainer.Hero
					coverUrl={project.coverUrl}
					showImage={theme.hero.image}
				>
					<div className="z-10 flex flex-1 flex-col items-center justify-center">
						<EventContainer.Hero.Title className="text-center">
							Inscreva-se em <br />
							{project.name}
						</EventContainer.Hero.Title>
						<EventContainer.Hero.Meta>
							<Calendar className="mr-2 h-4.5 w-4.5" />
							<span className="-mt-0.5 text-base">
								<EventContainer.EventDateRange
									startDate={project.startDate}
									endDate={project.endDate}
								/>
							</span>
						</EventContainer.Hero.Meta>
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
