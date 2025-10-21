"use client";

import { useMemo, useState, useEffect } from "react";

// Components
import { ActivityCard } from "@/components/activity/activity-card";
import { SearchBar } from "@/components/search-bar";
import { SortBy } from "@/components/sort-by";
import { Empty } from "@/components/empty";
import { FilterBy } from "@/components/filter-by";

// Icons
import { ChevronUp } from "lucide-react";

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
		const initialExpanded = hasToday
			? new Set(["Hoje"])
			: new Set(categories);
		return { grouped, categories, initialExpanded };
	}, [filteredActivities]);

	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
		new Set(),
	);

	useEffect(() => {
		setExpandedCategories(initialExpanded);
	}, [initialExpanded]);

	const toggleCategory = (category: string) => {
		setExpandedCategories((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(category)) {
				newSet.delete(category);
			} else {
				newSet.add(category);
			}
			return newSet;
		});
	};

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
					categories.map((category) => {
						const isExpanded = expandedCategories.has(category);
						return (
							<div key={category} className="mb-8">
								<button
									type="button"
									onClick={() => toggleCategory(category)}
									className="mb-4 flex items-center gap-2"
								>
									<ChevronUp
										className={`h-5 w-5 transition-transform duration-300 ${
											isExpanded
												? "rotate-0"
												: "rotate-180"
										}`}
									/>
									<h3 className="text-xl font-bold">
										{category}
									</h3>
								</button>
								<div
									className={`overflow-hidden transition-all duration-300 ${
										isExpanded
											? "max-h-screen opacity-100"
											: "max-h-0 opacity-0"
									}`}
								>
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
								</div>
							</div>
						);
					})
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
