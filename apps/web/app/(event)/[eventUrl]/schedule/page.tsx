import { Calendar } from "lucide-react";
import { serverClient } from "@/lib/trpc/server";

// Components
import { ActivityCard } from "@/components/landing/activity-card";
import { SearchBar } from "@/components/dashboard/search-bar";
import { SortBy } from "@/components/dashboard/sort-by";
import * as EventContainer from "@/components/landing/event-container";

export default async function EventSchedulePage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;

	const { project: event } = await serverClient.getProject({ url: eventUrl });

	const { activities } = await serverClient.getActivities({
		projectId: event.id,
		page: 0,
		pageSize: 20,
	});

	return (
		<EventContainer.Holder>
			<EventContainer.Hero coverUrl={event.coverUrl}>
				<div className="z-10 flex flex-1 flex-col items-start justify-center">
					<div className="mb-4 flex items-center text-lg text-white/90">
						<Calendar className="mr-2 h-4.5 w-4.5" />
						<span className="-mt-0.5 text-base">
							De {event.startDate.toLocaleDateString()} a{" "}
							{event.endDate.toLocaleDateString()}
						</span>
					</div>
					<h1 className="mb-4 text-5xl font-bold text-white">
						Programação
					</h1>
					<p className="text-primary-foreground/90 text-base font-semibold md:max-w-md">
						Acompanhe as próximas atividades de {event.name}, tanto
						internas, como externas, e saiba quando participar!
					</p>
				</div>
			</EventContainer.Hero>

			<EventContainer.Content>
				<div className="container-p mb-8 flex flex-col justify-between gap-4 md:flex-row">
					<SearchBar placeholder="Pesquisar atividades" />
					<div className="flex gap-4">
						<SortBy
							sortBy={"recent"}
							items={[
								{ value: "recent", label: "Mais recentes" },
								{ value: "oldest", label: "Mais antigas" },
								{ value: "alphabetical", label: "Alfabética" },
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
					<h2 className="mb-4 text-xl font-bold">Atividades</h2>
					<div className="grid gap-6 md:grid-cols-2">
						{activities.map((activity) => (
							<ActivityCard
								key={activity.id}
								activity={activity}
							/>
						))}
					</div>
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
