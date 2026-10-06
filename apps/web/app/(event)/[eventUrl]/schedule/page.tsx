import { Calendar } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import * as EventContainer from "@/components/landing/event-container";
import { ScheduleLoading } from "./content-skeleton";
import { ScheduleWrapper } from "@/components/schedule-wrapper";
import { SchedulePageSkeleton } from "./skeleton";
import { getProject } from "@/lib/data";
import { parseEventTheme } from "@verific/drizzle/theme";

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
 * Gate antes de qualquer `<Suspense>`: evento desconhecido responde
 * 404 real. (O gate do layout já cobre isso; este `notFound` fica como
 * rede de segurança + narrowing de tipos.)
 */
export default async function EventSchedulePage({ params }: Props) {
	const { eventUrl } = await params;
	const result = await getProject(eventUrl);

	if (!result?.project) {
		notFound();
	}

	return (
		<Suspense fallback={<SchedulePageSkeleton />}>
			<SchedulePageBody project={result.project} />
		</Suspense>
	);
}
