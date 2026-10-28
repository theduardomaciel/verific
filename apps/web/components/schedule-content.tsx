"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { toast } from "sonner";

import type { RouterOutput } from "@verific/api";
import { sortOptions, sortOptionsLabels } from "@verific/api/utils";
import {
	activityCategories,
	activityCategoryLabels,
} from "@verific/drizzle/enum/category";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

import { ActivityCard } from "@/components/activity/activity-card";
import {
	QuickJoinDialog,
	type JoinBlockReason,
	type QuickJoinActivity,
} from "@/components/activity/quick-join-dialog";
import { Empty } from "@/components/empty";
import { FilterBy } from "@/components/filter-by";
import { SearchBar } from "@/components/search-bar";
import { SortBy } from "@/components/sort-by";

import { useActivityAvailability } from "@/hooks/use-activity-availability";
import { useNow } from "@/hooks/use-now";
import { useSubscribedActivities } from "@/hooks/use-subscribed-activities";
import {
	categorizeByDate,
	expandSessionOccurrences,
	getFirstSessionStart,
	hasEverySessionEnded,
	type ActivitySessionLike,
} from "@/lib/date";
import { fuzzyFilter } from "@/lib/fuzzy-search";
import { findScheduleConflicts, type Conflict } from "@/lib/schedule/conflicts";
import { trpc } from "@/lib/trpc/react";

interface ScheduleContentProps {
	activities: RouterOutput["getActivities"]["activities"];
	projectId: string;
	eventUrl: string;
}

type ScheduleActivity = RouterOutput["getActivities"]["activities"][number];

/** Uma atividade por sessão, como renderizada na programação. */
interface Occurrence {
	activity: ScheduleActivity;
	session: ActivitySessionLike;
	sessionIndex: number;
	sessionCount: number;
}

/** Valor do item de acordeão que agrupa as atividades já encerradas. */
const PAST_SECTION_ID = "ja-aconteceram";

export function ScheduleContent({
	activities,
	projectId,
	eventUrl,
}: ScheduleContentProps) {
	const router = useRouter();
	const utils = trpc.useUtils();
	const activityIds = useMemo(
		() => activities.map((activity) => activity.id),
		[activities],
	);
	const availability = useActivityAvailability({ projectId, activityIds });
	// A lista cacheada traz a contagem da última invalidação; a query pública
	// substitui o número assim que chega, sem mudar o resto do payload.
	const displayActivities = useMemo(
		() =>
			activities.map((activity) => {
				const row = availability.byActivity.get(activity.id);
				return row
					? {
							...activity,
							participantsCount: row.participantsCount,
						}
					: activity;
			}),
		[activities, availability.byActivity],
	);
	const {
		userId,
		subscribedIds,
		participantId,
		isPending: isMembershipPending,
	} = useSubscribedActivities(eventUrl);

	// Uma única leitura das filas do usuário no evento (sem N+1 por
	// card): `Map<activityId, entry>` reutilizado por todos os cards.
	const waitlistQuery = trpc.getMyWaitlistEntries.useQuery(
		{ projectUrl: eventUrl },
		{
			enabled: Boolean(participantId),
			staleTime: 2 * 60 * 1000,
			gcTime: 5 * 60 * 1000,
			refetchOnWindowFocus: false,
		},
	);
	const waitlistByActivity = useMemo(
		() =>
			new Map(
				(waitlistQuery.data ?? []).map((entry) => [
					entry.activityId,
					entry,
				]),
			),
		[waitlistQuery.data],
	);
	// Enquanto vínculo ou fila resolvem, os cards mostram ação neutra
	// (`Carregando...`) em vez de piscar "Quero participar" -> "Inscrito"
	// ou "Entrar na fila" -> "Aguardando na fila".
	const isActionResolving =
		isMembershipPending ||
		(Boolean(participantId) && waitlistQuery.isPending);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [sortBy, setSortBy] = useState<string | undefined>(undefined);
	const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
	const [tagFilter, setTagFilter] = useState<string[]>([]);

	// Quick join: uma instância de diálogo para a programação inteira.
	const [quickJoinId, setQuickJoinId] = useState<string | null>(null);
	// Pós-join local: estado "Inscrito" imediato. A contagem de vagas vem
	// da query de disponibilidade (s-maxage=60), fonte volátil única — somar
	// +1 aqui duplicaria o valor quando a query já trouxesse a nova inscrição.
	const [joinedIds, setJoinedIds] = useState<string[]>([]);
	// Respostas do servidor em corrida: o card reflete o estado real.
	const [exhaustedIds, setExhaustedIds] = useState<string[]>([]);
	const [closedIds, setClosedIds] = useState<string[]>([]);

	const quickJoinActivity = useMemo(
		() => displayActivities.find((a) => a.id === quickJoinId) ?? null,
		[displayActivities, quickJoinId],
	);

	// Conflitos de horário por atividade: conjunto inscrito = vínculo do
	// servidor (`subscribedIds`) ∪ join local (`joinedIds`, imediato).
	// Fonte é sempre `displayActivities` (nunca a lista filtrada) para busca
	// e filtros nunca esconderem conflitos. Uma computação, sem hook por card.
	// O `now` congela na montagem (regras `react(purity)`/`set-state-in-effect`
	// barram relógio no render): suficiente para avisos consultivos, que
	// recalculam a cada navegação.
	const [frozenNow] = useState(() => new Date());

	const conflictMap = useMemo(() => {
		const map = new Map<string, Conflict[]>();
		if (!userId || !participantId || !frozenNow) return map;
		const enrolledIds = new Set([...(subscribedIds ?? []), ...joinedIds]);
		if (enrolledIds.size === 0) return map;
		const enrolledById = new Map(displayActivities.map((a) => [a.id, a]));
		const enrolled = [...enrolledIds]
			.map((id) => enrolledById.get(id))
			.filter((a) => a !== undefined);
		for (const activity of displayActivities) {
			if (enrolledIds.has(activity.id)) continue;
			if (hasEverySessionEnded(activity.sessions)) continue;
			const conflicts = findScheduleConflicts(
				activity,
				enrolled,
				frozenNow,
			);
			if (conflicts.length > 0) map.set(activity.id, conflicts);
		}
		return map;
	}, [
		displayActivities,
		subscribedIds,
		joinedIds,
		userId,
		participantId,
		frozenNow,
	]);

	function handleJoined(activity: QuickJoinActivity): void {
		setQuickJoinId(null);
		setJoinedIds((prev) =>
			prev.includes(activity.id) ? prev : [...prev, activity.id],
		);
		// A contagem não invalida mais o cache do servidor; a query pública
		// é atualizada no cliente após o join.
		void utils.getActivityAvailability.invalidate();
		// `id` fixo no toast: duplo clique compartilha a promessa e pode
		// chamar isto duas vezes — o segundo substitui, não empilha.
		toast.success(`Inscrição confirmada em ${activity.name}`, {
			id: `quick-join-${activity.id}`,
		});
		// Atrasa o foco para depois do retorno de foco do Radix (que
		// mira o botão "Quero participar", já trocado por "Inscrito").
		window.setTimeout(() => {
			document
				.getElementById(activity.id)
				?.focus({ preventScroll: true });
		}, 50);
	}

	function handleBlocked(
		activity: QuickJoinActivity,
		reason: JoinBlockReason,
	): void {
		setQuickJoinId(null);
		if (reason === "full") {
			setExhaustedIds((prev) =>
				prev.includes(activity.id) ? prev : [...prev, activity.id],
			);
			void utils.getActivityAvailability.invalidate();
			toast.error(
				activity.waitlistEnabled === false
					? "As vagas acabaram."
					: "As vagas acabaram. Você ainda pode entrar na fila de espera.",
			);
		} else if (reason === "disabled") {
			toast.error("A fila de espera desta atividade foi desativada.");
			router.push(`/${eventUrl}/schedule/${activity.id}`);
		} else if (reason === "closed") {
			setClosedIds((prev) =>
				prev.includes(activity.id) ? prev : [...prev, activity.id],
			);
			toast.error("As inscrições foram encerradas.");
		} else if (reason === "conflict") {
			// O hook já invalidou vínculo + inscritas: o mapa recalcula
			// e o card vira o tratamento bloqueado sozinho.
			toast.error(
				"Esta atividade conflita com outra em que você já está inscrito.",
			);
		} else {
			toast.info("Esta atividade pede informações adicionais.");
			router.push(`/${eventUrl}/schedule/${activity.id}`);
		}
	}

	const cleanFilters = () => {
		setSearchQuery("");
		setCategoryFilter([]);
		setTagFilter([]);
		setSortBy(undefined);
	};

	const availableTags = useMemo(() => {
		const map = new Map<
			string,
			{ id: string; name: string; color: string }
		>();
		for (const activity of displayActivities) {
			for (const tag of activity.tags ?? []) {
				if (!map.has(tag.id)) map.set(tag.id, tag);
			}
		}
		return [...map.values()].sort((a, b) =>
			a.name.localeCompare(b.name, "pt-BR"),
		);
	}, [displayActivities]);

	const filteredActivities = useMemo(() => {
		let filtered = displayActivities;

		if (searchQuery) {
			filtered = fuzzyFilter(
				filtered,
				searchQuery,
				(a) => a.name,
				(a) => `${a.name} ${a.description ?? ""}`,
			);
		}

		if (categoryFilter.length > 0) {
			filtered = filtered.filter((a) =>
				categoryFilter.includes(a.category),
			);
		}

		if (tagFilter.length > 0) {
			filtered = filtered.filter((a) =>
				(a.tags ?? []).some((tag) => tagFilter.includes(tag.id)),
			);
		}

		// sort
		const sorted = [...filtered];
		if (sortBy === "asc") {
			sorted.sort(
				(a, b) =>
					(getFirstSessionStart(a.sessions)?.getTime() ?? 0) -
					(getFirstSessionStart(b.sessions)?.getTime() ?? 0),
			);
		} else if (sortBy === "desc") {
			sorted.sort(
				(a, b) =>
					(getFirstSessionStart(b.sessions)?.getTime() ?? 0) -
					(getFirstSessionStart(a.sessions)?.getTime() ?? 0),
			);
		} else if (sortBy === "name_asc") {
			sorted.sort((a, b) => a.name.localeCompare(b.name));
		} else if (sortBy === "name_desc") {
			sorted.sort((a, b) => b.name.localeCompare(a.name));
		}

		return sorted;
	}, [displayActivities, searchQuery, categoryFilter, tagFilter, sortBy]);

	const now = useNow();

	const occurrences = useMemo<Occurrence[]>(
		() => expandSessionOccurrences(filteredActivities),
		[filteredActivities],
	);

	// Sessão encerrada vira "Já aconteceram"; sessão em andamento continua na
	// programação. `now` é nulo no HTML estático: até hidratar, nada é passado,
	// para o corte não ficar congelado no build. Relógio único para o corte e
	// para os rótulos "Hoje"/"Amanhã".
	const { upcomingOccurrences, pastOccurrences } = useMemo(() => {
		if (!now) {
			return {
				upcomingOccurrences: occurrences,
				pastOccurrences: [] as Occurrence[],
			};
		}
		const upcoming: Occurrence[] = [];
		const past: Occurrence[] = [];
		for (const occurrence of occurrences) {
			const ended =
				new Date(occurrence.session.endsAt).getTime() < now.getTime();
			(ended ? past : upcoming).push(occurrence);
		}
		return { upcomingOccurrences: upcoming, pastOccurrences: past };
	}, [occurrences, now]);

	const {
		grouped,
		categories,
		pastGrouped,
		pastCategories,
		pastRangeLabel,
		initialExpanded,
		opensPastSection,
	} = useMemo(() => {
		const upcoming = categorizeByDate(
			upcomingOccurrences,
			(occurrence) => occurrence.session.startsAt,
			now,
		);
		const past = categorizeByDate(
			pastOccurrences,
			(occurrence) => occurrence.session.startsAt,
			now,
		);
		const hasToday = upcoming.categories.includes("Hoje");
		// Evento já encerrado — ou busca que só encontra atividades antigas:
		// abre o grupo, senão a página pareceria vazia.
		const opensPastSection =
			past.categories.length > 0 && upcoming.categories.length === 0;
		return {
			grouped: upcoming.grouped,
			categories: upcoming.categories,
			pastGrouped: past.grouped,
			pastCategories: past.categories,
			pastRangeLabel:
				past.categories.length > 1
					? `${past.categories[0]} – ${past.categories[past.categories.length - 1]}`
					: (past.categories[0] ?? null),
			initialExpanded: [
				...(opensPastSection ? [PAST_SECTION_ID] : []),
				...(hasToday ? ["Hoje"] : upcoming.categories),
			],
			opensPastSection,
		};
	}, [upcomingOccurrences, pastOccurrences, now]);

	const pastActivityCount = useMemo(
		() => new Set(pastOccurrences.map((o) => o.activity.id)).size,
		[pastOccurrences],
	);

	const [expandedCategories, setExpandedCategories] =
		useState<string[]>(initialExpanded);

	// Só reage a mudanças de filtro/busca e ao surgimento de "Hoje" (que só
	// existe no cliente): recargas de dados (ex.: a disponibilidade após uma
	// inscrição) não fecham o que o usuário abriu.
	// Ajuste durante a renderização em vez de efeito: sem render cascata.
	const filterKey = JSON.stringify([
		searchQuery,
		sortBy,
		categoryFilter,
		tagFilter,
		categories.includes("Hoje"),
		opensPastSection,
	]);
	const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
	if (prevFilterKey !== filterKey) {
		setPrevFilterKey(filterKey);
		setExpandedCategories(initialExpanded);
	}

	function renderOccurrenceGrid(items: Occurrence[], ended: boolean) {
		return (
			<div className="flex flex-col gap-6 md:grid md:grid-cols-2">
				{items.map((occurrence, idx, arr) => {
					const { activity } = occurrence;
					const isLastOdd =
						arr.length % 2 === 1 && idx === arr.length - 1;
					const isJoined = joinedIds.includes(activity.id);
					const waitlistEntry = waitlistByActivity.get(activity.id);
					return (
						<ActivityCard
							key={`${activity.id}-${occurrence.sessionIndex}`}
							className={isLastOdd ? "md:col-span-2" : undefined}
							activity={activity}
							occurrenceSession={
								occurrence.sessionCount > 1
									? occurrence.session
									: null
							}
							occurrenceLabel={
								occurrence.sessionCount > 1
									? `Sessão ${occurrence.sessionIndex + 1} de ${occurrence.sessionCount}`
									: null
							}
							occurrenceEnded={ended}
							participantId={
								isJoined
									? participantId
									: subscribedIds?.includes(activity.id)
										? participantId
										: undefined
							}
							eventParticipantId={participantId}
							subscribedIds={subscribedIds}
							waitlistPosition={waitlistEntry?.position ?? null}
							hasWaitlistOffer={
								waitlistEntry?.status === "offered"
							}
							isActionLoading={isActionResolving}
							userId={userId}
							onQuickJoin={(selected) =>
								setQuickJoinId(selected.id)
							}
							statusOverride={
								exhaustedIds.includes(activity.id)
									? "full"
									: closedIds.includes(activity.id)
										? "closed"
										: null
							}
							conflicts={conflictMap.get(activity.id) ?? []}
						/>
					);
				})}
			</div>
		);
	}

	return (
		<>
			<div className="container-p mb-8 flex flex-col justify-between gap-4 md:flex-row">
				<SearchBar
					placeholder="Pesquisar atividades"
					value={searchQuery}
					onChange={setSearchQuery}
				/>
				<div className="flex gap-4 max-md:flex-wrap">
					<SortBy
						value={sortBy}
						onChange={setSortBy}
						items={sortOptions.map((option) => ({
							value: option,
							label: sortOptionsLabels[option],
						}))}
					/>
					{availableTags.length > 0 ? (
						<FilterBy
							value={tagFilter}
							onChange={setTagFilter}
							placeholder="Filtrar trilhas"
							items={availableTags.map((tag) => ({
								value: tag.id,
								label: tag.name,
							}))}
						/>
					) : null}
					<FilterBy
						value={categoryFilter}
						onChange={setCategoryFilter}
						placeholder="Filtrar categorias"
						items={activityCategories.map((category) => ({
							value: category,
							label: activityCategoryLabels[category],
						}))}
					/>
				</div>
			</div>
			<div className="container-p">
				{filteredActivities.length > 0 ? (
					<Accordion
						type="multiple"
						value={expandedCategories}
						onValueChange={setExpandedCategories}
						className="w-full"
					>
						{pastCategories.length > 0 ? (
							<AccordionItem value={PAST_SECTION_ID}>
								<AccordionTrigger className="font-subtitle text-xl font-bold">
									<span className="flex flex-col items-start gap-1 text-left">
										<span>Já aconteceram</span>
										<span className="text-muted-foreground text-sm font-normal">
											{pastActivityCount}{" "}
											{pastActivityCount === 1
												? "atividade"
												: "atividades"}
											{pastRangeLabel
												? ` · ${pastRangeLabel}`
												: null}
										</span>
									</span>
								</AccordionTrigger>
								<AccordionContent className="-m-4 p-4">
									<div className="flex flex-col gap-8">
										{pastCategories.map((category) => (
											<section
												key={category}
												className="flex flex-col gap-4"
											>
												<h3 className="text-muted-foreground font-subtitle text-base font-bold">
													{category}
												</h3>
												{renderOccurrenceGrid(
													pastGrouped.get(category)!,
													true,
												)}
											</section>
										))}
									</div>
								</AccordionContent>
							</AccordionItem>
						) : null}
						{categories.map((category) => (
							<AccordionItem key={category} value={category}>
								<AccordionTrigger className="font-subtitle text-xl font-bold">
									{category}
								</AccordionTrigger>
								<AccordionContent className="-m-4 p-4">
									{renderOccurrenceGrid(
										grouped.get(category)!,
										false,
									)}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				) : searchQuery ||
				  categoryFilter.length > 0 ||
				  tagFilter.length > 0 ? (
					<Empty>
						<button
							onClick={cleanFilters}
							className="text-foreground cursor-pointer underline"
						>
							Limpar filtros
						</button>
					</Empty>
				) : (
					<Empty
						title="Este evento ainda não possui atividades :("
						description="As atividades serão adicionadas em breve. Fique ligado!"
					/>
				)}
			</div>

			{quickJoinActivity && participantId && userId ? (
				<QuickJoinDialog
					activity={quickJoinActivity}
					participantId={participantId}
					userId={userId}
					open={quickJoinId !== null}
					onOpenChange={(next) => {
						if (!next) setQuickJoinId(null);
					}}
					onJoined={handleJoined}
					onBlocked={handleBlocked}
					eventUrl={eventUrl}
				/>
			) : null}
		</>
	);
}
