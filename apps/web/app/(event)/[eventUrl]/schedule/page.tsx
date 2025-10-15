import { Calendar } from "lucide-react";
import { serverClient } from "@/lib/trpc/server";

import { cn } from "@/lib/utils";

// Components
import { ActivityCard } from "@/components/activity/activity-card";
import { SearchBar } from "@/components/dashboard/search-bar";
import { SortBy } from "@/components/dashboard/sort-by";
import * as EventContainer from "@/components/landing/event-container";
import { Empty } from "@/components/empty";

// Validation
import type { z } from "zod";
import { getActivitiesParams } from "@verific/api/routers/activities";

// Auth
import { auth } from "@verific/auth";

// Utils
import { categorizeByDate } from "@/lib/date-categorization";

type SchedulePageParams = z.infer<typeof getActivitiesParams>;

export default async function EventSchedulePage(props: {
	params: Promise<{ eventUrl: string }>;
	searchParams: Promise<SchedulePageParams>;
}) {
	const { eventUrl } = await props.params;

	const { project: event } = await serverClient.getProject({ url: eventUrl });

	const searchParams = await props.searchParams;
	const parsedParams = getActivitiesParams.parse(searchParams);

	const { activities } = await serverClient.getActivities({
		projectId: event.id,
		...parsedParams,
	});

	const session = await auth();

	const { grouped, categories } = categorizeByDate(
		activities,
		(activity) => activity.dateFrom,
	);

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
					<p className="text-primary-foreground text-base font-semibold md:max-w-md">
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
					{activities.length > 0 ? (
						categories.map((category) => (
							<div key={category} className="mb-8">
								<h3 className="mb-4 text-xl font-bold">
									{category}
								</h3>
								<div className="grid gap-6 md:grid-cols-2">
									{grouped
										.get(category)!
										.map((activity, idx, arr) => {
											const isLastOdd =
												arr.length % 2 === 1 &&
												idx === arr.length - 1;
											return (
												<div
													key={activity.id}
													className={cn(
														isLastOdd
															? "md:col-span-2"
															: "",
													)}
												>
													<ActivityCard
														activity={activity}
														userId={
															session?.user.id
														}
													/>
												</div>
											);
										})}
								</div>
							</div>
						))
					) : (
						<Empty />
					)}
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
