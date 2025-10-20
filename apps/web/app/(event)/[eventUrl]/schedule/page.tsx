import { Calendar } from "lucide-react";

// Components
import * as EventContainer from "@/components/landing/event-container";
import { ActivityCard } from "@/components/activity/activity-card";
import { SearchBar } from "@/components/search-bar";
import { SortBy } from "@/components/sort-by";
import { Empty } from "@/components/empty";
import { FilterBy } from "@/components/filter-by";

// Validation
import type { z } from "zod";
import { getActivitiesParams } from "@verific/api/routers/activities";

// Auth
import { auth } from "@verific/auth";

// Types & Enums
import {
	activityCategories,
	activityCategoryLabels,
} from "@verific/drizzle/enum/category";
import { sortOptions, sortOptionsLabels } from "@verific/api/utils";

// Lib
import { categorizeByDate } from "@/lib/date";
import {
	getCachedActivities,
	getCachedSubscribedActivitiesIdsFromParticipant,
	getProject,
} from "@/lib/data";

type SchedulePageParams = z.infer<typeof getActivitiesParams>;

export default async function EventSchedulePage(props: {
	params: Promise<{ eventUrl: string }>;
	searchParams: Promise<SchedulePageParams>;
}) {
	const { eventUrl } = await props.params;
	const session = await auth();
	const userId = session?.user.id;

	const { project } = await getProject(eventUrl);

	const searchParams = await props.searchParams;
	const { sort, ...parsedParams } = getActivitiesParams.parse(searchParams);

	const { activities, totalParticipants } = await getCachedActivities({
		projectId: project.id,
		pageSize: 100, // Fetch all activities for the schedule (placeholder value)
		sort: sort || "asc",
		...parsedParams,
	});

	const result = userId
		? await getCachedSubscribedActivitiesIdsFromParticipant(userId)
		: null;

	const { grouped, categories } = categorizeByDate(
		activities,
		(activity) => activity.dateFrom,
	);

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
					<h1 className="mb-4 text-5xl font-bold text-white">
						Programação
					</h1>
					<p className="text-primary-foreground text-base font-semibold md:max-w-md">
						Acompanhe as próximas atividades de {project.name} e
						saiba como e quando participar!
					</p>
				</div>
			</EventContainer.Hero>

			<EventContainer.Content>
				<div className="container-p mb-8 flex flex-col justify-between gap-4 md:flex-row">
					<SearchBar placeholder="Pesquisar atividades" />
					<div className="flex gap-4">
						<SortBy
							sortBy={sort}
							items={sortOptions.map((option) => ({
								value: option,
								label: sortOptionsLabels[option],
							}))}
						/>
						<FilterBy
							name="category"
							filterBy={parsedParams.category}
							items={activityCategories.map((category) => ({
								value: category,
								label: activityCategoryLabels[category],
							}))}
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
								<div className="flex flex-col gap-6 md:grid md:grid-cols-2">
									{grouped
										.get(category)!
										.map((activity, idx, arr) => {
											const isLastOdd =
												arr.length % 2 === 1 &&
												idx === arr.length - 1;
											return (
												<ActivityCard
													key={activity.id}
													className={
														isLastOdd
															? "md:col-span-2"
															: undefined
													}
													activity={activity}
													totalParticipants={
														totalParticipants
													}
													participantId={
														result?.ids.includes(
															activity.id,
														)
															? result.participantId
															: undefined
													}
													userId={userId}
												/>
											);
										})}
								</div>
							</div>
						))
					) : parsedParams.query || parsedParams.category ? (
						<Empty href={`/${eventUrl}/schedule`} />
					) : (
						<Empty
							title="Este evento ainda não possui atividades :("
							description="As atividades serão adicionadas em breve. Fique ligado!"
						/>
					)}
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
