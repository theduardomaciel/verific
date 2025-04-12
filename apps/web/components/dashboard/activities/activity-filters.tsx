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
import { useIsMobile } from "@/hooks/use-mobile";

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
	const isMobile = useIsMobile();

	const [isFiltersOpen, setIsFiltersOpen] = useState(!isMobile);
	const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
	const [isStatusesExpanded, setIsStatusesExpanded] = useState(false);
	const [isMonitorsExpanded, setIsMonitorsExpanded] = useState(false);

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
		// biome-ignore lint/complexity/noForEach: This is a simple loop to add selected categories to the URL params
		selectedCategories.forEach((category) => {
			params.append("categories", category);
		});

		// Add selected statuses
		// biome-ignore lint/complexity/noForEach: This is a simple loop to add selected categories to the URL params
		selectedStatuses.forEach((status) => {
			params.append("statuses", status);
		});

		// Add selected monitors
		// biome-ignore lint/complexity/noForEach: This is a simple loop to add selected categories to the URL params
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
		<div className="border rounded-md overflow-hidden">
			<Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
				<CollapsibleTrigger className="flex w-full items-center justify-between p-4 font-medium">
					Filtros
					{isFiltersOpen ? (
						<ChevronUp className="h-4 w-4" />
					) : (
						<ChevronDown className="h-4 w-4" />
					)}
				</CollapsibleTrigger>
				<CollapsibleContent className="px-4 pb-4 space-y-6">
					{/* Categories */}
					<div className="space-y-3">
						<h3 className="font-medium">Filtrar por Categoria</h3>
						<div className="space-y-2">
							{categories.slice(0, 2).map((category) => (
								<div key={category.id} className="flex items-center space-x-2">
									<Checkbox
										id={`category-${category.id}`}
										checked={selectedCategories.includes(category.id)}
										onCheckedChange={(checked) =>
											handleCategoryChange(category.id, checked as boolean)
										}
									/>
									<label
										htmlFor={`category-${category.id}`}
										className="text-sm"
									>
										{category.label}
									</label>
								</div>
							))}

							{categories.length > 2 && (
								<Collapsible
									open={isCategoriesExpanded}
									onOpenChange={setIsCategoriesExpanded}
								>
									<CollapsibleTrigger className="flex items-center text-sm text-blue-600">
										<ChevronDown className="h-4 w-4 mr-1" /> Ver mais
									</CollapsibleTrigger>
									<CollapsibleContent className="space-y-2 pt-2">
										{categories.slice(2).map((category) => (
											<div
												key={category.id}
												className="flex items-center space-x-2"
											>
												<Checkbox
													id={`category-${category.id}`}
													checked={selectedCategories.includes(category.id)}
													onCheckedChange={(checked) =>
														handleCategoryChange(
															category.id,
															checked as boolean,
														)
													}
												/>
												<label
													htmlFor={`category-${category.id}`}
													className="text-sm"
												>
													{category.label}
												</label>
											</div>
										))}
									</CollapsibleContent>
								</Collapsible>
							)}
						</div>
					</div>

					{/* Statuses */}
					<div className="space-y-3">
						<h3 className="font-medium">Filtrar por Status</h3>
						<div className="space-y-2">
							{statuses.slice(0, 2).map((status) => (
								<div key={status.id} className="flex items-center space-x-2">
									<Checkbox
										id={`status-${status.id}`}
										checked={selectedStatuses.includes(status.id)}
										onCheckedChange={(checked) =>
											handleStatusChange(status.id, checked as boolean)
										}
									/>
									<label htmlFor={`status-${status.id}`} className="text-sm">
										{status.label}
									</label>
								</div>
							))}

							{statuses.length > 2 && (
								<Collapsible
									open={isStatusesExpanded}
									onOpenChange={setIsStatusesExpanded}
								>
									<CollapsibleTrigger className="flex items-center text-sm text-blue-600">
										<ChevronDown className="h-4 w-4 mr-1" /> Ver mais
									</CollapsibleTrigger>
									<CollapsibleContent className="space-y-2 pt-2">
										{statuses.slice(2).map((status) => (
											<div
												key={status.id}
												className="flex items-center space-x-2"
											>
												<Checkbox
													id={`status-${status.id}`}
													checked={selectedStatuses.includes(status.id)}
													onCheckedChange={(checked) =>
														handleStatusChange(status.id, checked as boolean)
													}
												/>
												<label
													htmlFor={`status-${status.id}`}
													className="text-sm"
												>
													{status.label}
												</label>
											</div>
										))}
									</CollapsibleContent>
								</Collapsible>
							)}
						</div>
					</div>

					{/* Monitors */}
					<div className="space-y-3">
						<h3 className="font-medium">Filtrar por Monitor</h3>
						<div className="flex flex-wrap gap-2">
							{selectedMonitors.map((monitorId) => {
								const monitor = monitors.find((m) => m.id === monitorId);
								if (!monitor) return null;

								return (
									<Badge
										key={monitorId}
										variant="outline"
										className="flex items-center gap-2 py-1 px-2"
									>
										<div className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
											{monitor.avatar}
										</div>
										{monitor.name}
										<button
											type="button"
											onClick={() => handleRemoveMonitor(monitorId)}
										>
											<X className="h-3 w-3" />
										</button>
									</Badge>
								);
							})}
						</div>

						<Collapsible
							open={isMonitorsExpanded}
							onOpenChange={setIsMonitorsExpanded}
						>
							<CollapsibleTrigger className="flex items-center text-sm text-blue-600">
								<ChevronDown className="h-4 w-4 mr-1" /> Ver mais
							</CollapsibleTrigger>
							<CollapsibleContent className="space-y-2 pt-2">
								{monitors
									.filter((m) => !selectedMonitors.includes(m.id))
									.map((monitor) => (
										<div
											key={monitor.id}
											className="flex items-center space-x-2"
										>
											<Checkbox
												id={`monitor-${monitor.id}`}
												checked={selectedMonitors.includes(monitor.id)}
												onCheckedChange={(checked) =>
													handleMonitorChange(monitor.id, checked as boolean)
												}
											/>
											<label
												htmlFor={`monitor-${monitor.id}`}
												className="text-sm flex items-center gap-2"
											>
												<div className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
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
