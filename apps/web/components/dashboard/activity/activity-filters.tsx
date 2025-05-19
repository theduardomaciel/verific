"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface Category {
	id: string;
	label: string;
}

interface Status {
	id: string;
	label: string;
}

interface Monitor {
	id: string;
	name: string;
	avatar: string;
}

interface ActivityFiltersProps {
	categories: Category[];
	statuses: Status[];
	monitors: Monitor[];
	defaultSelectedCategories?: string[];
	defaultSelectedStatuses?: string[];
	defaultSelectedMonitors?: string[];
}

interface FilterListProps {
	title: string;
	items: { id: string; label: string }[];
	selectedItems: string[];
	onItemChange: (id: string, checked: boolean) => void;
}

export function FilterList({
	title,
	items,
	selectedItems,
	onItemChange,
}: FilterListProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className="space-y-3">
			<h3 className="font-medium">{title}</h3>
			<div className="space-y-2">
				{items.slice(0, 2).map((item) => (
					<div key={item.id} className="flex items-center space-x-2">
						<Checkbox
							id={`${title}-${item.id}`}
							checked={selectedItems.includes(item.id)}
							onCheckedChange={(checked) =>
								onItemChange(item.id, checked as boolean)
							}
						/>
						<label
							htmlFor={`${title}-${item.id}`}
							className="text-sm"
						>
							{item.label}
						</label>
					</div>
				))}

				{items.length > 2 && (
					<Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
						<CollapsibleTrigger className="flex items-center text-sm text-blue-600">
							{isExpanded ? (
								<ChevronUp className="mr-1 h-4 w-4" />
							) : (
								<ChevronDown className="mr-1 h-4 w-4" />
							)}{" "}
							Ver mais
						</CollapsibleTrigger>
						<CollapsibleContent className="space-y-2 pt-2">
							{items.slice(2).map((item) => (
								<div
									key={item.id}
									className="flex items-center space-x-2"
								>
									<Checkbox
										id={`${title}-${item.id}`}
										checked={selectedItems.includes(
											item.id,
										)}
										onCheckedChange={(checked) =>
											onItemChange(
												item.id,
												checked as boolean,
											)
										}
									/>
									<label
										htmlFor={`${title}-${item.id}`}
										className="text-sm"
									>
										{item.label}
									</label>
								</div>
							))}
						</CollapsibleContent>
					</Collapsible>
				)}
			</div>
		</div>
	);
}

export function ActivityFilters({
	categories,
	statuses,
	monitors,
	defaultSelectedCategories = [],
	defaultSelectedStatuses = [],
	defaultSelectedMonitors = [],
}: ActivityFiltersProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const isMobile = useMediaQuery("(max-width: 768px)");

	const [isFiltersOpen, setIsFiltersOpen] = useState(!isMobile);

	const [selectedCategories, setSelectedCategories] = useState<string[]>(
		defaultSelectedCategories,
	);
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
		defaultSelectedStatuses,
	);
	const [selectedMonitors, setSelectedMonitors] = useState<string[]>(
		defaultSelectedMonitors,
	);

	// Update URL when filters change
	const updateFilters = () => {
		const params = new URLSearchParams(searchParams.toString());

		// Clear existing filter params
		params.delete("categories");
		params.delete("statuses");
		params.delete("monitors");

		// Add selected categories
		selectedCategories.forEach((category) => {
			params.append("categories", category);
		});

		// Add selected statuses
		selectedStatuses.forEach((status) => {
			params.append("statuses", status);
		});

		// Add selected monitors
		selectedMonitors.forEach((monitor) => {
			params.append("monitors", monitor);
		});

		router.push(`/dashboard/activities?${params.toString()}`);
	};

	// Handle category checkbox change
	const handleCategoryChange = (categoryId: string, checked: boolean) => {
		const newSelectedCategories = checked
			? [...selectedCategories, categoryId]
			: selectedCategories.filter((id) => id !== categoryId);

		setSelectedCategories(newSelectedCategories);
		setTimeout(updateFilters, 0);
	};

	// Handle status checkbox change
	const handleStatusChange = (statusId: string, checked: boolean) => {
		const newSelectedStatuses = checked
			? [...selectedStatuses, statusId]
			: selectedStatuses.filter((id) => id !== statusId);

		setSelectedStatuses(newSelectedStatuses);
		setTimeout(updateFilters, 0);
	};

	// Handle monitor checkbox change
	const handleMonitorChange = (monitorId: string, checked: boolean) => {
		const newSelectedMonitors = checked
			? [...selectedMonitors, monitorId]
			: selectedMonitors.filter((id) => id !== monitorId);

		setSelectedMonitors(newSelectedMonitors);
		setTimeout(updateFilters, 0);
	};

	// Handle removing a monitor
	const handleRemoveMonitor = (monitorId: string) => {
		setSelectedMonitors(selectedMonitors.filter((id) => id !== monitorId));
		setTimeout(updateFilters, 0);
	};

	return (
		<div className="overflow-hidden rounded-md border">
			<Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
				<CollapsibleTrigger className="flex w-full items-center justify-between p-4 font-medium">
					Filtros
					{isFiltersOpen ? (
						<ChevronUp className="h-4 w-4" />
					) : (
						<ChevronDown className="h-4 w-4" />
					)}
				</CollapsibleTrigger>
				<CollapsibleContent className="space-y-6 px-4 pb-4">
					{/* Categories */}
					<FilterList
						title="Filtrar por Categoria"
						items={categories}
						selectedItems={selectedCategories}
						onItemChange={handleCategoryChange}
					/>

					{/* Statuses */}
					<FilterList
						title="Filtrar por Status"
						items={statuses}
						selectedItems={selectedStatuses}
						onItemChange={handleStatusChange}
					/>

					{/* Monitors */}
					<div className="space-y-3">
						<h3 className="font-medium">Filtrar por Monitor</h3>
						<div className="flex flex-wrap gap-2">
							{selectedMonitors.map((monitorId) => {
								const monitor = monitors.find(
									(m) => m.id === monitorId,
								);
								if (!monitor) return null;

								return (
									<Badge
										key={monitorId}
										variant="outline"
										className="flex items-center gap-2 px-2 py-1"
									>
										<div className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white">
											{monitor.avatar}
										</div>
										{monitor.name}
										<button
											type="button"
											onClick={() =>
												handleRemoveMonitor(monitorId)
											}
										>
											<X className="h-3 w-3" />
										</button>
									</Badge>
								);
							})}
						</div>

						<Collapsible
							open={isFiltersOpen}
							onOpenChange={setIsFiltersOpen}
						>
							<CollapsibleTrigger className="flex items-center text-sm text-blue-600">
								<ChevronDown className="mr-1 h-4 w-4" /> Ver
								mais
							</CollapsibleTrigger>
							<CollapsibleContent className="space-y-2 pt-2">
								{monitors
									.filter(
										(m) => !selectedMonitors.includes(m.id),
									)
									.map((monitor) => (
										<div
											key={monitor.id}
											className="flex items-center space-x-2"
										>
											<Checkbox
												id={`monitor-${monitor.id}`}
												checked={selectedMonitors.includes(
													monitor.id,
												)}
												onCheckedChange={(checked) =>
													handleMonitorChange(
														monitor.id,
														checked as boolean,
													)
												}
											/>
											<label
												htmlFor={`monitor-${monitor.id}`}
												className="flex items-center gap-2 text-sm"
											>
												<div className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white">
													{monitor.avatar}
												</div>
												{monitor.name}
											</label>
										</div>
									))}
							</CollapsibleContent>
						</Collapsible>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
