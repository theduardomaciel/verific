"use client";

import { useMemo, useState, useEffect } from "react";

// Components
import { ActivityCard } from "@/components/activity/activity-card";
import { SearchBar } from "@/components/search-bar";
import { SortBy } from "@/components/sort-by";
import { Empty } from "@/components/empty";
import { FilterBy } from "@/components/filter-by";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

// Icons

// Utils
import {
	categorizeByDate,
	expandSessionOccurrences,
	getFirstSessionStart,
} from "@/lib/date";

// Enums
import {
	activityCategories,
	activityCategoryLabels,
} from "@verific/drizzle/enum/category";
import { sortOptions, sortOptionsLabels } from "@verific/api/utils";

// Types
import { RouterOutput } from "@verific/api";

// Hooks
import { useSubscribedActivities } from "@/hooks/use-subscribed-activities";

interface ScheduleContentProps {
	activities: RouterOutput["getActivities"]["activities"];
	eventUrl: string;
}

export function ScheduleContent({
	activities,
	eventUrl,
}: ScheduleContentProps) {
	const {
		userId,
		subscribedIds,
		participantId,
	} = useSubscribedActivities(eventUrl);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [sortBy, setSortBy] = useState<string | undefined>(undefined);
	const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
	const [tagFilter, setTagFilter] = useState<string[]>([]);

	const cleanFilters = () => {
		setSearchQuery("");
		setCategoryFilter([]);
		setTagFilter([]);
		setSortBy(undefined);
	};

	const availableTags = useMemo(() => {
		const map = new Map<string, { id: string; name: string; color: string }>();
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
	// sem flash de abrir/fechar no carregamento).
	useEffect(() => {
		setExpandedCategories(initialExpanded);
	}, [initialExpanded]);

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
			<div className="container-p mb-10">
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
															subscribedIds?.includes(
																activity.id,
															)
																? participantId
																: undefined
														}
														userId={userId}
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
		</>
	);
}
