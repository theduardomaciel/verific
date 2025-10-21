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
import { categorizeByDate } from "@/lib/date";

// Enums
import {
	activityCategories,
	activityCategoryLabels,
} from "@verific/drizzle/enum/category";
import { sortOptions, sortOptionsLabels } from "@verific/api/utils";

// Types
import { RouterOutput } from "@verific/api";

interface ScheduleContentProps {
	activities: RouterOutput["getActivities"]["activities"];
	userId?: string;
	result?: { ids: string[]; participantId: string } | null;
	eventUrl: string;
}

export function ScheduleContent({
	activities,
	userId,
	result,
	eventUrl,
}: ScheduleContentProps) {
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [sortBy, setSortBy] = useState<string>("asc");
	const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

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

		// sort
		const sorted = [...filtered];
		if (sortBy === "asc") {
			sorted.sort(
				(a, b) =>
					new Date(a.dateFrom).getTime() -
					new Date(b.dateFrom).getTime(),
			);
		} else if (sortBy === "desc") {
			sorted.sort(
				(a, b) =>
					new Date(b.dateFrom).getTime() -
					new Date(a.dateFrom).getTime(),
			);
		} else if (sortBy === "name_asc") {
			sorted.sort((a, b) => a.name.localeCompare(b.name));
		} else if (sortBy === "name_desc") {
			sorted.sort((a, b) => b.name.localeCompare(a.name));
		}

		return sorted;
	}, [activities, searchQuery, categoryFilter, sortBy]);

	const { grouped, categories, initialExpanded } = useMemo(() => {
		const { grouped, categories } = categorizeByDate(
			filteredActivities,
			(activity) => activity.dateFrom,
		);
		const hasToday = categories.includes("Hoje");
		const initialExpanded = hasToday ? ["Hoje"] : categories;
		return { grouped, categories, initialExpanded };
	}, [filteredActivities]);

	const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

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
								<AccordionTrigger className="text-xl font-bold">
									{category}
								</AccordionTrigger>
								<AccordionContent className="-m-4 p-4">
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
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				) : searchQuery || categoryFilter.length > 0 ? (
					<Empty href={`/${eventUrl}/schedule`} />
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
