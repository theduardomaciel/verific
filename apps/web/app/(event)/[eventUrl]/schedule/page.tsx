import { Calendar } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import * as EventContainer from "@/components/landing/event-container";
import ScheduleLoading from "./skeleton";
import { ScheduleWrapper } from "@/components/schedule-wrapper";
import { getProject } from "@/lib/data";

interface Props {
	params: Promise<{ eventUrl: string }>;
}

async function SchedulePageContent({ params }: Props) {
	const { eventUrl } = await params;
	const result = await getProject(eventUrl);

	if (!result?.project) {
		notFound();
	}

	const { project } = result;

	return (
		<EventContainer.Holder>
			<EventContainer.Hero coverUrl={project.coverUrl}>
				<div className="z-10 flex flex-1 flex-col items-start justify-center">
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
					<h1 className="font-heading mb-4 text-5xl font-bold text-white">
						Programação
					</h1>
					<p className="text-primary-foreground text-base font-semibold md:max-w-md">
						Acompanhe as próximas atividades de {project.name} e
						saiba como e quando participar!
					</p>
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

export default function EventSchedulePage(props: Props) {
	return (
		<Suspense fallback={<ScheduleLoading />}>
			<SchedulePageContent params={props.params} />
		</Suspense>
	);
}
