import {
	BellDot,
	Calendar,
	Clock,
	Edit,
	Megaphone,
	Share2,
	Trash,
} from "lucide-react";

// Components
import * as ParticipantsList from "@/components/dashboard/activity/participants-list";
import { DashboardPagination } from "@/components/dashboard/pagination";
import { SearchBar } from "@/components/dashboard/search-bar";
import { SortBy } from "@/components/dashboard/sort-by";
import { Badge } from "@/components/ui/badge";

// Data
import { getDateString, getTimeString } from "@/lib/date";
import { getActivityDetails } from "@/lib/data";

// Validation
import { z } from "zod";
import { CategoryCard } from "@/components/dashboard/category-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const activityDetailsPageParams = z.object({
	id: z.string(),
});

const activityDetailsPageSearchParams = z.object({
	page: z.coerce.number().default(0),
	pageSize: z.coerce.number().default(5),
	search: z.string().optional(),
	general_search: z.string().optional(),
	sortBy: z.enum(["recent", "oldest"]).optional(),
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

	const { activity, pageCount } = await getActivityDetails(id, {
		page,
		pageSize,
		general_search,
		sortBy,
	});

	const participants = activity.participantsOnActivity
		.filter((t) => t.participant.role === "participant")
		.map((t) => {
			return {
				...t.participant,
				joinedAt: t.joinedAt,
			};
		});

	const dateString = getDateString(activity);
	const timeFrom = getTimeString(activity.dateFrom);
	const timeTo = getTimeString(activity.dateTo);

	return (
		<main className="py-container-v container-p flex min-h-screen flex-col items-center justify-start gap-9">
			<div className="flex w-full flex-col items-start justify-start gap-4">
				<div className="flex w-full flex-row flex-wrap items-start justify-between gap-4">
					<h1 className="font-title text-foreground max-w-full text-4xl font-extrabold md:text-5xl lg:max-w-[60%]">
						{activity.name}
					</h1>
					<span className="text-foreground text-base font-semibold opacity-50">
						#{activity.id.split("-")[0]}
					</span>
				</div>
				<div className="flex flex-row items-center justify-start gap-4">
					<Badge variant={"secondary"}>
						<Calendar className="h-4 w-4" />
						{dateString}
					</Badge>
					<Badge variant={"secondary"}>
						<Clock className="h-4 w-4" />
						{timeFrom} - {timeTo}
					</Badge>
					<Badge variant={"secondary"}>
						<Megaphone className="h-4 w-4" />
						15m de tolerância
					</Badge>
				</div>
				<h2 className="text-muted-foreground text-base leading-normal font-medium">
					{activity.description}
				</h2>
			</div>
			<div className="flex w-full flex-col items-center justify-start gap-4 md:flex-row">
				<CategoryCard
					className="w-full"
					category={activity.category}
					hours={activity.workload}
					speakerName={activity.speaker.name}
				/>
				<div className="flex flex-row items-center gap-3 max-md:w-full max-md:flex-wrap md:justify-between">
					<div className="flex w-full flex-row items-center gap-3">
						<Button
							asChild
							size={"icon"}
							variant={"destructive"}
							className="h-10 min-w-10"
						>
							<Link href={`/dashboard/activities/${id}/edit`}>
								<Trash className="h-5 w-5" />
							</Link>
						</Button>
						<Button
							size={"icon"}
							variant={"outline"}
							className="h-10 min-w-10"
						>
							<Share2 className="h-5 w-5" />
						</Button>
						<Button
							asChild
							size={"lg"}
							variant={"outline"}
							className="h-10 min-w-10"
						>
							<Link
								href={`/dashboard/activities/${id}/edit`}
								className="flex-1"
							>
								<Edit className="h-5 w-5" />
								Editar
							</Link>
						</Button>
					</div>
					<Button size={"lg"} className="h-10 flex-1">
						<BellDot className="h-5 w-5" />
						Abrir fila de espera
					</Button>
				</div>
			</div>
			<div className="flex w-full flex-col items-start justify-start gap-12 md:flex-row">
				<div className="flex w-full flex-col items-center justify-start gap-4 md:w-3/5">
					<ParticipantsList.Holder>
						<ParticipantsList.Title>
							Participantes
						</ParticipantsList.Title>
						<div className="flex w-full flex-col items-start justify-start gap-2 sm:flex-row sm:gap-4">
							<SearchBar
								word={"general_search"}
								placeholder="Pesquisar participantes"
							/>
							<SortBy
								sortBy={sortBy}
								items={[
									{
										label: "Mais recentes",
										value: "recent",
									},
									{
										label: "Mais antigos",
										value: "oldest",
									},
								]}
							/>
						</div>
						<ParticipantsList.List
							hasActivity
							participants={participants}
							activityId={activity.id}
						/>
					</ParticipantsList.Holder>
					{participants && participants.length > 0 && (
						<DashboardPagination
							currentPage={page || 1}
							totalPages={pageCount}
							prefix={`activities/${activity.id}`}
						/>
					)}
				</div>
				<ParticipantsList.Holder className="md:w-2/5">
					<ParticipantsList.Title>Moderadores</ParticipantsList.Title>
					<ParticipantsList.List
						participants={activity.participantsOnActivity
							.map((t) => t.participant)
							.filter((t) => t.role === "moderator")}
						activityId={activity.id}
					/>
				</ParticipantsList.Holder>
			</div>
		</main>
	);
}
