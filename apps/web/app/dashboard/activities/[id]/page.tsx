import { ParticipantsList } from "@/components/dashboard/activities/participants-list";
import { SearchBar } from "@/components/dashboard/search-bar";
import { SortBy } from "@/components/dashboard/sort-by";
import { getActivityDetails } from "@/lib/data";
import { getDateString, getTimeString } from "@/lib/date";
import { Suspense } from "react";

// Validation
import { z } from "zod";

const activityDetailsPageParams = z.object({
	id: z.string(),
});

const activityDetailsPageSearchParams = z.object({
	page: z.coerce.number().default(0),
	pageSize: z.coerce.number().default(5),
	search: z.string().optional(),
	general_search: z.string().optional(),
	sortBy: z.enum(["recent", "oldest"]).optional(),
	r: z.string().optional(),
});

type EventDetailsPageParams = z.infer<typeof activityDetailsPageParams>;
type EventDetailsPageSearchParams = z.infer<
	typeof activityDetailsPageSearchParams
>;

export default async function ActivityPage(props: {
	params: Promise<EventDetailsPageParams>;
	searchParams: Promise<EventDetailsPageSearchParams>;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	const { id } = activityDetailsPageParams.parse(params);
	const { page, pageSize, general_search, sortBy } =
		activityDetailsPageSearchParams.parse(searchParams);

	const { activity, participants, pageCount } = await getActivityDetails(id, {
		page,
		pageSize,
		general_search,
		sortBy,
	});

	const dateString = getDateString(activity);
	const timeFrom = getTimeString(activity.dateFrom);
	const timeTo = getTimeString(activity.dateTo);

	return (
		<main className="p-dashboard flex min-h-screen flex-col items-center justify-start gap-9">
			<div className="flex w-full flex-col items-start justify-start gap-4">
				<div className="flex w-full flex-row flex-wrap items-start justify-between gap-4">
					<h1 className="font-title text-neutral max-w-full text-4xl font-extrabold md:text-5xl lg:max-w-[60%]">
						{activity.name}
					</h1>
					<span className="text-foreground text-base font-semibold opacity-50">
						#{activity.id.split("-")[0]}
					</span>
				</div>
				<div className="flex flex-row items-center justify-start gap-4">
					{/* <DateDisplay dateString={dateString} /> */}
					<div className="bg-neutral h-1 w-1 rounded-full" />
					<p className="text-base font-medium">
						de {timeFrom} às {timeTo}
					</p>
				</div>
				<h2 className="text-neutral text-base leading-normal font-semibold">
					{activity.description}
				</h2>
			</div>
			<div className="flex w-full flex-col items-center justify-start gap-4 md:flex-row">
				<div className="flex w-full flex-col items-start justify-start gap-4 sm:flex-row sm:gap-9">
					<SearchBar
						word={"general_search"}
						placeholder="Pesquisar participantes"
					/>
					<div className="flex flex-row items-center justify-between gap-4 max-sm:w-full sm:justify-end">
						<span className="text-sm font-medium text-nowrap">
							Ordenar por
						</span>
						<SortBy
							sortBy={sortBy}
							items={[
								{ label: "Mais recentes", value: "recent" },
								{ label: "Mais antigos", value: "oldest" },
							]}
						/>
					</div>
				</div>
			</div>
			<div className="flex w-full flex-col items-start justify-start gap-12 md:flex-row">
				<div className="flex w-full flex-col items-center justify-start gap-4 md:w-3/5">
					<ParticipantsList
						participants={participants.filter(
							(member) => member && member.role === "moderator",
						)}
						activityId={activity.id}
					/>
					{participants && participants.length > 0 && (
						<Suspense fallback={null}>
							{/* <PagesDisplay
								currentPage={page || 1}
								pageCount={pageCount}
							/> */}
						</Suspense>
					)}
					{/* <div className="xs:flex-row xs:justify-between flex w-full flex-col items-center justify-start gap-4">
						<MemberAdd
							projectId={env.PROJECT_ID}
							activityId={activity.id}
							alreadyAddedMembers={participants.map(
								(member) => member!.id,
							)}
							search={searchParams.search}
							activityName={activity.name.split(" ")[1]}
						/>
						<ShareDialog
							url={`https://ichess-web.vercel.app:3000/activitys/presence/${activity.id}`}
						/>
					</div> */}
				</div>
				<ParticipantsList
					className="md:w-2/5"
					participants={
						activity.participantsOnActivity.filter(
							(t) => t.role === "moderator",
						)
						/* .map((t) => t.participant) */
					}
					activityId={activity.id}
					isModerators
				/>
			</div>
		</main>
	);
}
