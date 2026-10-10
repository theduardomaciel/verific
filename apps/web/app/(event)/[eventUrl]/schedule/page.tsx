import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Calendar } from "lucide-react";

import { parseEventTheme } from "@verific/drizzle/theme";

import * as EventContainer from "@/components/landing/event-container";
import { ScheduleWrapper } from "@/components/schedule-wrapper";

import { getEventStaticParams, getProject } from "@/lib/data";

import { ScheduleLoading } from "./content-skeleton";
import { SchedulePageSkeleton } from "./skeleton";

/**
 * Exige saída estática completa (nível `navigation`): o build falha se
 * alguém introduzir `cookies()`, `headers()` ou dado não cacheado nesta
 * rota — mantém a programação servida pela CDN sob carga pública.
 */
export const ensureStatic = "navigation";

export async function generateStaticParams() {
	return getEventStaticParams();
}

interface Props {
	params: Promise<{ eventUrl: string }>;
}

type SchedulePageProject = NonNullable<
	Awaited<ReturnType<typeof getProject>>
>["project"];

function SchedulePageBody({ project }: { project: SchedulePageProject }) {
	const theme = parseEventTheme({
		theme: (project as { theme?: unknown }).theme,
		primaryColor: project.primaryColor,
		secondaryColor: project.secondaryColor,
	});
	return (
		<EventContainer.Holder>
			<EventContainer.Hero
				coverUrl={project.coverUrl}
				showImage={theme.hero.image}
			>
				<div className="z-10 flex flex-1 flex-col items-start justify-center">
					<EventContainer.Hero.Meta>
						<Calendar className="mr-2 h-4.5 w-4.5" />
						<span className="-mt-0.5 text-base">
							<EventContainer.EventDateRange
								startDate={project.startDate}
								endDate={project.endDate}
							/>
						</span>
					</EventContainer.Hero.Meta>
					<EventContainer.Hero.Title>
						Programação
					</EventContainer.Hero.Title>
					<EventContainer.Hero.Description>
						Acompanhe as próximas atividades de {project.name} e
						saiba como e quando participar!
					</EventContainer.Hero.Description>
				</div>
			</EventContainer.Hero>

			<EventContainer.Content>
				<Suspense fallback={<ScheduleLoading />}>
					<ScheduleWrapper
						project={{
							id: project.id,
							url: project.url,
						}}
					/>
				</Suspense>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}

/**
 * `params` é dado de URL: lido fora de `<Suspense>`, prende o App Shell a
 * um único link e quebra o prefetch compartilhado (`instant-shell-url-data`).
 * Por isso a leitura + `getProject` vivem no loader abaixo, dentro da
 * fronteira. O `notFound` continua valendo — e o layout acima já barra
 * `eventUrl` desconhecido com 404 real antes disso.
 */
export default function EventSchedulePage({ params }: Props) {
	return (
		<Suspense fallback={<SchedulePageSkeleton />}>
			<SchedulePageLoader params={params} />
		</Suspense>
	);
}

async function SchedulePageLoader({ params }: Props) {
	const { eventUrl } = await params;
	const result = await getProject(eventUrl);

	if (!result?.project) {
		notFound();
	}

	return <SchedulePageBody project={result.project} />;
}
