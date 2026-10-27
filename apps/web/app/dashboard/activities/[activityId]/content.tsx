"use client";

import Link from "next/link";
import { useState } from "react";

import { keepPreviousData } from "@tanstack/react-query";
import {
	Calendar,
	Clock,
	Edit,
	ClipboardList,
	Megaphone,
	MapPin,
	Share2,
	Trash,
} from "lucide-react";
import { toast } from "sonner";

// Validation (client-safe: no db / server env imports)
import { getActivityParams } from "@verific/api/schemas";
import { appUrl } from "@verific/env";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CategoryCard } from "@/components/dashboard/category-card";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { DashboardPagination } from "@/components/dashboard/pagination";
import { AddParticipantsDialog } from "@/components/dialogs/add-participants-dialog";
import { ActivityDeleteDialog } from "@/components/dialogs/delete-dialog";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { ExportParticipantsButton } from "@/components/participant/export-button";
import * as ParticipantsList from "@/components/participant/participants-list";
import { SearchBar } from "@/components/search-bar";
import { CollapsibleDescription } from "@/components/shared/collapsible-description";
import { SortBy } from "@/components/sort-by";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useParsedSearchParams } from "@/hooks/use-parsed-search-params";
import {
	getSessionsDateString,
	getSessionTimeString,
	getSessionsSorted,
} from "@/lib/date";
import { listToString } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

import { WaitlistTab } from "./waitlist-tab";

type ActivityTab = "participants" | "monitors" | "waitlist";

export function ActivityContent({ activityId }: { activityId: string }) {
	const { projectId, isOwner, can } = useDashboard();
	const utils = trpc.useUtils();
	const releaseNoShowMutation = trpc.releaseNoShowSeats.useMutation();
	const parsedParams = useParsedSearchParams((raw) =>
		getActivityParams.parse(raw),
	);

	// Hooks must stay above the early returns below.
	// Keep in sync with the `lg:` classes used in this file and in waitlist-list.tsx.
	const isDesktop = useMediaQuery("(min-width: 1024px)");
	const [tab, setTab] = useState<ActivityTab>("participants");

	const { data, isPending, isError } = trpc.getActivity.useQuery(
		{
			activityId,
			pageSize: 100,
		},
		{
			placeholderData: keepPreviousData,
			staleTime: 2 * 60 * 1000,
			refetchOnWindowFocus: false,
		},
	);

	if (isPending) {
		return (
			<main className="py-container-v container-p flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col items-center justify-start gap-9">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-64 w-full" />
				<Skeleton className="h-96 w-full" />
			</main>
		);
	}

	if (isError || !data) {
		return (
			<main className="py-container-v container-p flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col items-center justify-start">
				<p className="text-muted-foreground text-sm">
					Não foi possível carregar a atividade. Tente recarregar a
					página.
				</p>
			</main>
		);
	}

	const { activity, participantsAmount, overbookedAmount, pageCount } = data;

	const monitors = activity.participants.filter((t) => t.role === "monitor");

	const participants = activity.participants.filter(
		(t) => t.role === "participant",
	);

	const sessions = getSessionsSorted(activity.sessions);
	const dateString = getSessionsDateString(sessions);

	// The waitlist only makes sense when the activity has a seat limit.
	const hasWaitlist =
		!!activity.participantsLimit && activity.participantsLimit > 0;

	// Desktop merges participants + monitors into a single "people" tab;
	// mobile/tablet keeps them as separate tabs.
	const tabsValue: ActivityTab | "people" =
		isDesktop && tab !== "waitlist" ? "people" : tab;

	const handleTabChange = (value: string) => {
		setTab(value === "people" ? "participants" : (value as ActivityTab));
	};

	const showTabsList = !isDesktop || hasWaitlist;

	const participantsPanel = (
		<div className="flex w-full min-w-0 flex-col gap-4">
			<ParticipantsList.Holder>
				<ParticipantsList.Title className="flex w-full min-w-0 flex-row items-center justify-between gap-2">
					<p>Participantes</p>
					<span className="text-muted-foreground truncate text-sm font-medium">
						{participantsAmount &&
						activity.participantsLimit &&
						activity.participantsLimit > 0
							? overbookedAmount > 0
								? `${overbookedAmount} acima do limite (${participantsAmount}/${activity.participantsLimit})`
								: `Vagas disponíveis: ${Math.max(
										0,
										activity.participantsLimit -
											participantsAmount,
									)}/${activity.participantsLimit}`
							: participantsAmount && participantsAmount > 0
								? `${participantsAmount} participante${
										participantsAmount !== 1 ? "s" : ""
									}`
								: null}
					</span>
				</ParticipantsList.Title>
				{/* Wraps instead of overflowing when the column is narrow */}
				<div className="flex w-full min-w-0 items-center gap-3 max-sm:flex-wrap">
					<SearchBar
						prefix={"search"}
						placeholder="Pesquisar participantes"
						className="min-w-0 max-sm:w-full sm:min-w-56 sm:flex-1"
					/>
					<div className="flex w-full min-w-0 items-center gap-3 md:w-auto">
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
				</div>
				<ParticipantsList.List
					hasActivity
					participants={participants}
					sessions={activity.sessions}
					activityId={activity.id}
					projectUrl={activity.project.url}
					currentParticipantId={data.participantId}
				/>
			</ParticipantsList.Holder>
			{participants && pageCount > 1 && (
				<div className="flex w-full justify-center">
					<DashboardPagination
						currentPage={parsedParams.page || 1}
						totalPages={pageCount}
						prefix={`activities/${activity.id}`}
					/>
				</div>
			)}
		</div>
	);

	const monitorsPanel = (
		<div className="w-full min-w-0">
			<ParticipantsList.Holder>
				<ParticipantsList.Title>Monitores</ParticipantsList.Title>
				<ParticipantsList.List
					participants={monitors}
					sessions={activity.sessions}
					activityId={activity.id}
					projectUrl={activity.project.url}
					currentParticipantId={data.participantId}
					emptyMessage={{
						title: "Nenhum monitor encontrado",
						description:
							"Adicione monitores para que eles possam gerenciar a fila de espera.",
					}}
				/>
			</ParticipantsList.Holder>
		</div>
	);

	return (
		<main className="py-container-v container-p flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col items-center justify-start gap-9">
			<div className="flex w-full flex-col items-start justify-start gap-4">
				<div className="flex w-full flex-row flex-wrap items-start justify-between gap-4">
					<h1 className="text-foreground max-w-full text-4xl font-extrabold first-letter:capitalize md:text-5xl lg:max-w-[60%]">
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
					{(activity.tags ?? []).map((tag) => (
						<Badge key={tag.id} variant={"secondary"}>
							<span
								className="h-2 w-2 rounded-full"
								style={{ backgroundColor: tag.color }}
							/>
							{tag.name}
						</Badge>
					))}
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
				<CollapsibleDescription
					key={activity.id}
					description={activity.description}
				/>
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
						{/* Exclusão é restrita ao dono do evento no servidor. */}
						{isOwner ? (
							<ActivityDeleteDialog activityId={activityId}>
								<Button
									size={"icon"}
									variant={"destructive"}
									className="h-10 min-w-10"
								>
									<Trash size={20} />
								</Button>
							</ActivityDeleteDialog>
						) : null}
						<ShareDialog
							url={`${appUrl}/${activity.project.url}/schedule/${activity.id}`}
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
						{activity.form ? (
							<Button
								asChild
								size={"icon"}
								variant={"outline"}
								className="h-10 min-w-10"
							>
								<Link
									href={`/dashboard/activities/${activityId}/form`}
									prefetch={false}
								>
									<ClipboardList size={20} />
								</Link>
							</Button>
						) : null}
						<Button
							asChild
							size={"lg"}
							variant={"outline"}
							className="h-10 min-w-10"
						>
							<Link
								href={`/dashboard/activities/${activityId}/edit`}
								prefetch={false}
								className="flex-1"
							>
								<Edit size={20} />
								Editar
							</Link>
						</Button>
					</div>
					<AddParticipantsDialog
						projectId={projectId}
						activityId={activityId}
						alreadyAdded={activity.participants
							.filter((t) => t.role === "monitor")
							.map((t) => t.id)}
						allowOverCapacity={can("activities.manage")}
					/>
					{can("activities.manage") ? (
						<Button
							variant="outline"
							size="lg"
							className="h-10 min-h-10"
							onClick={async () => {
								try {
									const result =
										await releaseNoShowMutation.mutateAsync(
											{ activityId },
										);
									toast.success(
										result.released > 0
											? `${result.released} vaga(s) liberada(s) por ausência.`
											: "Nenhum ausente encontrado.",
									);
									await utils.getActivity.invalidate({
										activityId,
									});
								} catch (error) {
									toast.error(
										error instanceof Error
											? error.message
											: "Não foi possível liberar as vagas.",
									);
								}
							}}
						>
							Liberar vagas de ausentes
						</Button>
					) : null}
				</div>
			</div>
			<Tabs
				value={tabsValue}
				onValueChange={handleTabChange}
				className="w-full min-w-0 gap-4"
			>
				{showTabsList ? (
					<TabsList className="w-full lg:w-fit">
						{isDesktop ? (
							<>
								<TabsTrigger value="people">
									Participantes e monitores
								</TabsTrigger>
								<TabsTrigger value="waitlist">
									Fila de espera
								</TabsTrigger>
							</>
						) : (
							<>
								<TabsTrigger value="participants">
									Participantes
								</TabsTrigger>
								<TabsTrigger value="monitors">
									Monitores
								</TabsTrigger>
								{hasWaitlist ? (
									<TabsTrigger value="waitlist">
										Fila de espera
									</TabsTrigger>
								) : null}
							</>
						)}
					</TabsList>
				) : null}

				{/* Desktop: participants + monitors side by side */}
				<TabsContent value="people" className="w-full min-w-0">
					<div className="grid w-full min-w-0 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start xl:gap-12">
						{participantsPanel}
						{monitorsPanel}
					</div>
				</TabsContent>

				{/* Mobile/tablet: separate tabs */}
				<TabsContent value="participants" className="w-full min-w-0">
					{participantsPanel}
				</TabsContent>
				<TabsContent value="monitors" className="w-full min-w-0">
					{monitorsPanel}
				</TabsContent>

				{hasWaitlist ? (
					<TabsContent value="waitlist" className="w-full min-w-0">
						<WaitlistTab
							activityId={activityId}
							participantsLimit={activity.participantsLimit}
						/>
					</TabsContent>
				) : null}
			</Tabs>
		</main>
	);
}
