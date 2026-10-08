"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { toast } from "sonner";

// Types
import type { RouterOutput } from "@verific/api";
import { sortOptions, sortOptionsLabels } from "@verific/api/utils";
// Enums
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

// Components
import { ActivityCard } from "@/components/activity/activity-card";
import {
	QuickJoinDialog,
	type JoinBlockReason,
	type QuickJoinActivity,
} from "@/components/activity/quick-join-dialog";
import { Empty } from "@/components/empty";
// Icons
import { FilterBy } from "@/components/filter-by";
import { SearchBar } from "@/components/search-bar";
import { SortBy } from "@/components/sort-by";

// Hooks
import { useSubscribedActivities } from "@/hooks/use-subscribed-activities";
// Utils
import {
	categorizeByDate,
	expandSessionOccurrences,
	getFirstSessionStart,
	hasEverySessionEnded,
} from "@/lib/date";
import { findScheduleConflicts, type Conflict } from "@/lib/schedule/conflicts";

interface ScheduleContentProps {
	activities: RouterOutput["getActivities"]["activities"];
	eventUrl: string;
}

export function ScheduleContent({
	activities,
	eventUrl,
}: ScheduleContentProps) {
	const router = useRouter();
	const { userId, subscribedIds, participantId } =
		useSubscribedActivities(eventUrl);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [sortBy, setSortBy] = useState<string | undefined>(undefined);
	const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
	const [tagFilter, setTagFilter] = useState<string[]>([]);

	// Quick join: uma instância de diálogo para a programação inteira.
	const [quickJoinId, setQuickJoinId] = useState<string | null>(null);
	// Pós-join local (a contagem estática não muda sozinha): +1 vaga
	// ocupada e estado "Inscrito" imediatos até dados frescos chegarem.
	const [joinedIds, setJoinedIds] = useState<string[]>([]);
	// Respostas do servidor em corrida: o card reflete o estado real.
	const [exhaustedIds, setExhaustedIds] = useState<string[]>([]);
	const [closedIds, setClosedIds] = useState<string[]>([]);

	const quickJoinActivity = useMemo(
		() => activities.find((a) => a.id === quickJoinId) ?? null,
		[activities, quickJoinId],
	);

	// Conflitos de horário por atividade: conjunto inscrito = vínculo do
	// servidor (`subscribedIds`) ∪ join local (`joinedIds`, imediato).
	// Fonte é sempre `activities` (nunca a lista filtrada) para busca e
	// filtros nunca esconderem conflitos. Uma computação, sem hook por card.
	// O `now` congela na montagem (regras `react(purity)`/`set-state-in-effect`
	// barram relógio no render): suficiente para avisos consultivos, que
	// recalculam a cada navegação.
	const [now] = useState(() => new Date());

	const conflictMap = useMemo(() => {
		const map = new Map<string, Conflict[]>();
		if (!userId || !participantId || !now) return map;
		const enrolledIds = new Set([...(subscribedIds ?? []), ...joinedIds]);
		if (enrolledIds.size === 0) return map;
		const enrolledById = new Map(activities.map((a) => [a.id, a]));
		const enrolled = [...enrolledIds]
			.map((id) => enrolledById.get(id))
			.filter((a) => a !== undefined);
		for (const activity of activities) {
			if (enrolledIds.has(activity.id)) continue;
			if (hasEverySessionEnded(activity.sessions)) continue;
			const conflicts = findScheduleConflicts(activity, enrolled, now);
			if (conflicts.length > 0) map.set(activity.id, conflicts);
		}
		return map;
	}, [activities, subscribedIds, joinedIds, userId, participantId, now]);

	function handleJoined(activity: QuickJoinActivity): void {
		setQuickJoinId(null);
		setJoinedIds((prev) =>
			prev.includes(activity.id) ? prev : [...prev, activity.id],
		);
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
			toast.error(
				"As vagas acabaram. Você ainda pode entrar na fila de espera.",
			);
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
		for (const activity of activities) {
			for (const tag of activity.tags ?? []) {
				if (!map.has(tag.id)) map.set(tag.id, tag);
			}
		}
		return [...map.values()].sort((a, b) =>
			a.name.localeCompare(b.name, "pt-BR"),
		);
	}, [activities]);

	const filteredActivities = useMemo(() => {
		let filtered = activities;

		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(a) =>
					a.name.toLowerCase().includes(q) ||
					a.description?.toLowerCase().includes(q),
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
	}, [activities, searchQuery, categoryFilter, tagFilter, sortBy]);

	const { grouped, categories, initialExpanded } = useMemo(() => {
		const occurrences = expandSessionOccurrences(filteredActivities);
		const { grouped, categories } = categorizeByDate(
			occurrences,
			(occurrence) => occurrence.session.startsAt,
		);
		const hasToday = categories.includes("Hoje");
		const initialExpanded = hasToday ? ["Hoje"] : categories;
		return { grouped, categories, initialExpanded };
	}, [filteredActivities]);

	const [expandedCategories, setExpandedCategories] =
		useState<string[]>(initialExpanded);

	// Só reage a mudanças de filtro/busca (estado inicial já correto,
	// sem flash de abrir/fechar no carregamento). Ajuste durante a
	// renderização em vez de efeito: sem render cascata.
	const [prevInitialExpanded, setPrevInitialExpanded] =
		useState(initialExpanded);
	if (prevInitialExpanded !== initialExpanded) {
		setPrevInitialExpanded(initialExpanded);
		setExpandedCategories(initialExpanded);
	}

	return (
		<>
			<div className="container-p mb-8 flex flex-col justify-between gap-4 md:flex-row">
				<SearchBar
					placeholder="Pesquisar atividades"
					value={searchQuery}
					onChange={setSearchQuery}
				/>
				<div className="flex gap-4">
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
						{categories.map((category) => (
							<AccordionItem key={category} value={category}>
								<AccordionTrigger className="font-heading text-xl font-bold">
									{category}
								</AccordionTrigger>
								<AccordionContent className="-m-4 p-4">
									<div className="flex flex-col gap-6 md:grid md:grid-cols-2">
										{grouped
											.get(category)!
											.map((occurrence, idx, arr) => {
												const { activity } = occurrence;
												const isLastOdd =
													arr.length % 2 === 1 &&
													idx === arr.length - 1;
												const isJoined =
													joinedIds.includes(
														activity.id,
													);
												return (
													<ActivityCard
														key={`${activity.id}-${occurrence.sessionIndex}`}
														className={
															isLastOdd
																? "md:col-span-2"
																: undefined
														}
														activity={activity}
														occurrenceSession={
															occurrence.sessionCount >
															1
																? occurrence.session
																: null
														}
														occurrenceLabel={
															occurrence.sessionCount >
															1
																? `Sessão ${occurrence.sessionIndex + 1} de ${occurrence.sessionCount}`
																: null
														}
														participantId={
															isJoined
																? participantId
																: subscribedIds?.includes(
																			activity.id,
																	  )
																	? participantId
																	: undefined
														}
														eventParticipantId={
															participantId
														}
														subscribedIds={
															subscribedIds
														}
														userId={userId}
														onQuickJoin={(
															selected,
														) =>
															setQuickJoinId(
																selected.id,
															)
														}
														seatDelta={
															isJoined ? 1 : 0
														}
														statusOverride={
															exhaustedIds.includes(
																activity.id,
															)
																? "full"
																: closedIds.includes(
																			activity.id,
																	  )
																	? "closed"
																	: null
														}
														conflicts={
															conflictMap.get(
																activity.id,
															) ?? []
														}
													/>
												);
											})}
									</div>
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
				/>
			) : null}
		</>
	);
}
