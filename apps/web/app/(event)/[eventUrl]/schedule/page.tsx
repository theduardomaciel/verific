import { Calendar } from "lucide-react";
import { serverClient } from "@/lib/trpc/server";

// Components
import { SearchBar } from "@/components/dashboard/search-bar";
import { SortBy } from "@/components/dashboard/sort-by";
import * as EventContainer from "@/components/landing/event-container";
import { InfiniteActivityList } from "@/components/activity/infinite-activity-list";

// Validation
import type { z } from "zod";
import { getActivitiesParams } from "@verific/api/routers/activities";

// Auth
import { auth } from "@verific/auth";

type SchedulePageParams = z.infer<typeof getActivitiesParams>;

export default async function EventSchedulePage(props: {
	params: Promise<{ eventUrl: string }>;
	searchParams: Promise<SchedulePageParams>;
}) {
	const { eventUrl } = await props.params;

	const { project: event } = await serverClient.getProject({ url: eventUrl });

	const searchParams = await props.searchParams;
	const { sort, ...parsedParams } = getActivitiesParams.parse(searchParams);

	const { activities } = await serverClient.getActivities({
		projectId: event.id,
		pageSize: 100,
		sort: sort || "asc",
		...parsedParams,
	});

	const session = await auth();

	return (
		<EventContainer.Holder>
			<EventContainer.Hero coverUrl={event.coverUrl}>
				<div className="z-10 flex flex-1 flex-col items-start justify-center">
					<div className="mb-4 flex items-center text-lg text-white/90">
						<Calendar className="mr-2 h-4.5 w-4.5" />
						<span className="-mt-0.5 text-base">
							De {event.startDate.toLocaleDateString("pt-BR")} a{" "}
							{event.endDate.toLocaleDateString("pt-BR")}
						</span>
					</div>
					<h1 className="mb-4 text-5xl font-bold text-white">
						Programação
					</h1>
					<p className="text-primary-foreground text-base font-semibold md:max-w-md">
						Acompanhe as próximas atividades de {event.name} e saiba
						como e quando participar!
					</p>
				</div>
			</EventContainer.Hero>

			<EventContainer.Content>
				<div className="container-p mb-8 flex flex-col justify-between gap-4 md:flex-row">
					<SearchBar placeholder="Pesquisar atividades" />
					<div className="flex gap-4">
						<SortBy
							sortBy={"oldest"}
							items={[
								{ value: "recent", label: "Mais recentes" },
								{ value: "oldest", label: "Mais antigas" },
								{ value: "name_asc", label: "Nome A-Z" },
								{ value: "name_desc", label: "Nome Z-A" },
							]}
						/>
						<SortBy
							sortBy={"all"}
							items={[
								{ value: "all", label: "Todas as categorias" },
								{ value: "workshop", label: "Workshop" },
								{ value: "seminar", label: "Seminário" },
								{ value: "lecture", label: "Palestra" },
								{
									value: "round-table",
									label: "Roda de conversa",
								},
								{ value: "championship", label: "Campeonato" },
							]}
						/>
					</div>
				</div>

				<div className="container-p mb-10">
					<InfiniteActivityList
						initialActivities={activities}
						event={event}
						searchParams={parsedParams}
						sort={sort || "asc"}
						userId={session?.user.id}
					/>
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
