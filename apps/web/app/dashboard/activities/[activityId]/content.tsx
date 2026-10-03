"use client";

import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Icons
import {
	Calendar,
	Clock,
	Edit,
	Megaphone,
	MapPin,
	Share2,
	Trash,
} from "lucide-react";

// Components
import * as ParticipantsList from "@/components/participant/participants-list";
import { DashboardPagination } from "@/components/dashboard/pagination";
import { SearchBar } from "@/components/search-bar";
import { SortBy } from "@/components/sort-by";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryCard } from "@/components/dashboard/category-card";
import { ActivityDeleteDialog } from "@/components/dialogs/delete-dialog";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { AddMonitorDialog } from "@/components/dialogs/add-monitor-dialog";
import { Skeleton } from "@/components/ui/skeleton";

// Data
import {
	getSessionsDateString,
	getSessionTimeString,
	getSessionsSorted,
} from "@/lib/date";
import { listToString } from "@/lib/i18n";
import { ExportParticipantsButton } from "@/components/participant/export-button";

// Validation (client-safe: no db / server env imports)
import { getActivityParams } from "@verific/api/schemas";

// Hooks
import { useParsedSearchParams } from "@/hooks/use-parsed-search-params";
import { useDashboard } from "@/components/dashboard/dashboard-context";

// API
import { trpc } from "@/lib/trpc/react";
import { env } from "@verific/env";

export function ActivityContent({ activityId }: { activityId: string }) {
	const { projectId } = useDashboard();
	const parsedParams = useParsedSearchParams((raw) =>
		getActivityParams.parse(raw),
	);

	const { data, isPending, isError } = trpc.getActivity.useQuery(
		{
			activityId,
			pageSize: 100,
		},
		{
			placeholderData: keepPreviousData,
			staleTime: 30 * 1000,
			refetchOnWindowFocus: false,
		},
	);

	if (isPending) {
		return (
			<main className="py-container-v container-p flex min-h-screen flex-col items-center justify-start gap-9">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-64 w-full" />
				<Skeleton className="h-96 w-full" />
			</main>
		);
	}

	if (isError || !data) {
		return (
			<main className="py-container-v container-p flex min-h-screen flex-col items-center justify-start">
				<p className="text-muted-foreground text-sm">
					Não foi possível carregar a atividade. Tente recarregar a
					página.
				</p>
			</main>
		);
	}

	const { activity, participantsAmount, pageCount } = data;

	const monitors = activity.participants.filter((t) => t.role === "monitor");

	const participants = activity.participants.filter(
		(t) => t.role === "participant",
	);

	const sessions = getSessionsSorted(activity.sessions);
	const dateString = getSessionsDateString(sessions);

	return (
		<main className="py-container-v container-p flex min-h-screen flex-col items-center justify-start gap-9">
			<div className="flex w-full flex-col items-start justify-start gap-4">
				<div className="flex w-full flex-row flex-wrap items-start justify-between gap-4">
					<h1 className="font-title text-foreground max-w-full text-4xl font-extrabold first-letter:capitalize md:text-5xl lg:max-w-[60%]">
						{activity.name}
					</h1>
					<span className="text-foreground text-base font-semibold opacity-50">
						#{activity.id.split("-")[0]}
					</span>
				</div>
				<div className="flex w-full flex-row flex-wrap items-center justify-start gap-2 md:gap-4">
					<Badge variant={"secondary"}>
						<Calendar className="h-4 w-4" />
						{dateString}
						{sessions.length > 1
							? ` (${sessions.length} sessões)`
							: ""}
					</Badge>
					{sessions.map((session, i) => (
						<Badge key={i} variant={"secondary"}>
							<Clock className="h-4 w-4" />
							{getSessionTimeString(session)}
						</Badge>
					))}
					{activity.tolerance && activity.tolerance > 0 ? (
						<Badge variant={"secondary"}>
							<Megaphone className="h-4 w-4" />
							{activity.tolerance}m de tolerância
						</Badge>
					) : null}
					{activity.address ? (
						<Badge variant={"secondary"}>
							<MapPin className="h-4 w-4" />
							{activity.address}
						</Badge>
					) : null}
				</div>
				<div className="prose prose-sm dark:prose-invert max-w-none">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>
						{activity.description || ""}
					</ReactMarkdown>
				</div>
			</div>
			<div className="flex w-full flex-col items-center justify-start gap-4 md:flex-row">
				<CategoryCard
					className="w-full"
					category={activity.category}
					hours={activity.workload}
					text={
						activity.speakerOnActivity.length
							? listToString(
									activity.speakerOnActivity.map(
										(speakerOnActivity) =>
											speakerOnActivity.speaker.name,
									),
								)
							: "Nenhum palestrante"
					}
				/>
				<div className="flex flex-row items-center gap-3 max-md:w-full max-md:flex-wrap md:justify-between">
					<div className="flex w-full flex-row items-center gap-3">
						<ActivityDeleteDialog activityId={activityId}>
							<Button
								size={"icon"}
								variant={"destructive"}
								className="h-10 min-w-10"
							>
								<Trash size={20} />
							</Button>
						</ActivityDeleteDialog>
						<ShareDialog
							url={`${env.NEXT_PUBLIC_VERCEL_URL}/${activity.project.url}/schedule/${activity.id}`}
							title="Compartilhar atividade"
							description="O link abaixo permite que os participantes inscritos em seu evento se inscrevam na atividade"
						>
							<Button
								size={"icon"}
								variant={"outline"}
								className="h-10 min-w-10"
							>
								<Share2 size={20} />
							</Button>
						</ShareDialog>
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
					<AddMonitorDialog
						projectId={projectId}
						activityId={activityId}
						alreadyAdded={activity.participants
							.filter((t) => t.role === "monitor")
							.map((t) => t.id)}
					/>
				</div>
			</div>
			<div className="flex w-full flex-col items-start justify-start gap-12 md:flex-row">
				<div className="flex w-full flex-col items-center justify-start gap-4 md:w-3/5">
					<ParticipantsList.Holder>
						<ParticipantsList.Title className="flex w-full flex-row items-center justify-between">
							<p>Participantes</p>
							<span className="text-muted-foreground text-sm font-medium">
								{participantsAmount &&
								activity.participantsLimit &&
								activity.participantsLimit > 0
									? `Vagas disponíveis: ${activity.participantsLimit - participantsAmount}/${activity.participantsLimit}`
									: participantsAmount &&
										  participantsAmount > 0
										? `${participantsAmount} participante${
												participantsAmount !== 1
													? "s"
													: ""
											}`
										: null}
							</span>
						</ParticipantsList.Title>
						<div className="flex w-full flex-col items-start justify-start gap-2 sm:flex-row sm:gap-4">
							<SearchBar
								prefix={"search"}
								placeholder="Pesquisar participantes"
							/>
							<SortBy
								items={[
									{
										label: "Mais recentes",
										value: "desc",
									},
									{
										label: "Mais antigos",
										value: "asc",
									},
									{
										label: "Nome A-Z",
										value: "name_asc",
									},
									{
										label: "Nome Z-A",
										value: "name_desc",
									},
								]}
							/>
							<ExportParticipantsButton
								participants={participants.map((p) => ({
									name: p.user.name,
									email: p.user.email,
									createdAt: p.subscribedAt,
								}))}
							/>
						</div>
						<ParticipantsList.List
							hasActivity
							participants={participants}
							sessions={activity.sessions}
							activityId={activity.id}
						/>
					</ParticipantsList.Holder>
					{participants && pageCount > 1 && (
						<DashboardPagination
							currentPage={parsedParams.page || 1}
							totalPages={pageCount}
							prefix={`activities/${activity.id}`}
						/>
					)}
				</div>
				<ParticipantsList.Holder className="md:w-2/5">
					<ParticipantsList.Title>Monitores</ParticipantsList.Title>
					<ParticipantsList.List
						participants={monitors}
						sessions={activity.sessions}
						activityId={activity.id}
						emptyMessage={{
							title: "Nenhum monitor encontrado",
							description:
								"Adicione monitores para que eles possam gerenciar a fila de espera.",
						}}
					/>
				</ParticipantsList.Holder>
			</div>
		</main>
	);
}
