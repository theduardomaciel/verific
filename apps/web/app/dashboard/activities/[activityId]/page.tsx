import Link from "next/link";
import { cookies } from "next/headers";

import {
	Calendar,
	Clock,
	Edit,
	Globe,
	Megaphone,
	Share2,
	Trash,
} from "lucide-react";

// Components
import * as ParticipantsList from "@/components/participant/participants-list";
import { DashboardPagination } from "@/components/dashboard/pagination";
import { SearchBar } from "@/components/dashboard/search-bar";
import { SortBy } from "@/components/dashboard/sort-by";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryCard } from "@/components/dashboard/category-card";
import { EventDeleteDialog } from "@/components/activity/activity-delete-dialog";

// Data
import { getDateString, getTimeString } from "@/lib/date";

// Validation
import { z } from "zod";

// API
import { serverClient } from "@/lib/trpc/server";
import { getActivityParams } from "@verific/api/routers/activities";

type ActivityPageParams = z.infer<typeof getActivityParams>;

export default async function ActivityPage(props: {
	params: Promise<{ activityId: string }>;
	searchParams: Promise<ActivityPageParams>;
}) {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")!.value;

	const { activityId } = await props.params;

	const searchParams = await props.searchParams;
	const parsedParams = getActivityParams.parse(searchParams);

	const { activity, pageCount } = await serverClient.getActivity({
		activityId,
		...parsedParams,
	});

	const moderators = activity.participants.filter(
		(t) => t.role === "moderator",
	);

	const participants = activity.participants.filter(
		(t) => t.role === "participant",
	);

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
					{activity.tolerance && activity.tolerance > 0 ? (
						<Badge variant={"secondary"}>
							<Megaphone className="h-4 w-4" />
							{activity.tolerance}m de tolerância
						</Badge>
					) : null}
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
						<EventDeleteDialog activityId={activityId}>
							<Button
								size={"icon"}
								variant={"destructive"}
								className="h-10 min-w-10"
							>
								<Trash size={20} />
							</Button>
						</EventDeleteDialog>
						<Button
							size={"icon"}
							variant={"outline"}
							className="h-10 min-w-10"
						>
							<Share2 size={20} />
						</Button>
						<Button
							asChild
							size={"lg"}
							variant={"outline"}
							className="h-10 min-w-10"
						>
							<Link
								href={`/dashboard/activities/${activityId}/edit`}
								className="flex-1"
							>
								<Edit size={20} />
								Editar
							</Link>
						</Button>
					</div>
					{/* <Button size={"lg"} className="h-10 flex-1" disabled>
						<BellDot size={20} />
						Abrir fila de espera
					</Button> */}
					<Button size={"lg"} className="h-10 flex-1" asChild>
						<Link
							href={`/${activity.project.url}/schedule/${activity.id}`}
						>
							<Globe size={20} />
							Visitar página do evento
						</Link>
					</Button>
				</div>
			</div>
			<div className="flex w-full flex-col items-start justify-start gap-12 md:flex-row">
				<div className="flex w-full flex-col items-center justify-start gap-4 md:w-3/5">
					<ParticipantsList.Holder>
						<ParticipantsList.Title className="flex w-full flex-row items-center justify-between">
							<p>Participantes</p>
							<span className="text-muted-foreground text-sm font-medium">
								{activity.participantsLimit &&
								activity.participantsLimit > 0
									? `Vagas disponíveis: ${activity.participantsLimit - participants.length}/${activity.participantsLimit}`
									: participants.length > 0
										? `${participants.length} participante${
												participants.length !== 1
													? "s"
													: ""
											}`
										: null}
							</span>
						</ParticipantsList.Title>
						<div className="flex w-full flex-col items-start justify-start gap-2 sm:flex-row sm:gap-4">
							<SearchBar
								word={"general_search"}
								placeholder="Pesquisar participantes"
							/>
							<SortBy
								sortBy={parsedParams.sortBy}
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
							currentPage={parsedParams.page || 1}
							totalPages={pageCount}
							prefix={`activities/${activity.id}`}
						/>
					)}
				</div>
				<ParticipantsList.Holder className="md:w-2/5">
					<ParticipantsList.Title>Moderadores</ParticipantsList.Title>
					<ParticipantsList.List
						participants={moderators}
						activityId={activity.id}
						emptyMessage={{
							title: "Nenhum moderador encontrado",
							description:
								"Não há moderadores nesta atividade. Adicione moderadores para que eles possam gerenciar a fila de espera.",
						}}
					/>
				</ParticipantsList.Holder>
			</div>
		</main>
	);
}
