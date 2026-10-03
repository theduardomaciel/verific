"use client";

import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";

// Icons
import { Plus } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { DashboardPagination } from "@/components/dashboard/pagination";
import { SearchBar } from "@/components/search-bar";
import { SortBy } from "@/components/sort-by";
import { FiltersPanel } from "@/components/dashboard/filters-panel";
import { Filter } from "@/components/dashboard/filter";
import { Empty } from "@/components/empty";
import { ActivityCard } from "@/components/activity/activity-card/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { ReleaseRegistrationsDialog } from "@/components/dialogs/release-registrations-dialog";

// Validation (client-safe: no db / server env imports)
import { getActivitiesParams } from "@verific/api/schemas";

// Types & Enums
import {
	activityCategories,
	activityCategoryLabels,
} from "@verific/drizzle/schema";
import { sortOptions, sortOptionsLabels } from "@verific/api/utils";

// Hooks
import { useParsedSearchParams } from "@/hooks/use-parsed-search-params";
import { useDashboard } from "@/components/dashboard/dashboard-context";

// API
import { trpc } from "@/lib/trpc/react";

function ActivitiesSkeleton() {
	return (
		<div className="container-d py-container-v min-h-screen">
			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div className="w-full space-y-4 md:col-span-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-96 w-full" />
				</div>
				<div className="order-first space-y-4 md:order-last md:col-span-1">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		</div>
	);
}

export function ActivitiesContent() {
	const { projectId } = useDashboard();
	const parsedParams = useParsedSearchParams((raw) =>
		getActivitiesParams.parse(raw),
	);

	const { data, isPending, isError, isFetching } =
		trpc.getActivities.useQuery(
			{
				projectId,
				...parsedParams,
				fullQuery: true,
			},
			{
				placeholderData: keepPreviousData,
				staleTime: 30 * 1000,
				refetchOnWindowFocus: false,
			},
		);

	if (isPending) {
		return <ActivitiesSkeleton />;
	}

	if (isError || !data) {
		return (
			<div className="container-d py-container-v min-h-screen">
				<p className="text-muted-foreground text-sm">
					Não foi possível carregar as atividades. Tente recarregar a
					página.
				</p>
			</div>
		);
	}

	const { activities, pageCount } = data;
	const hasActiveFilters = Boolean(parsedParams.query);

	return (
		<div className="container-d py-container-v min-h-screen">
			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div className="w-full space-y-4 md:col-span-2">
					<div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
						<div className="relative w-full md:flex-1">
							<SearchBar placeholder="Pesquisar atividades..." />
						</div>
						<SortBy
							items={sortOptions.map((option) => ({
								value: option,
								label: sortOptionsLabels[option],
							}))}
						/>
					</div>

					<div
						className={
							isFetching
								? "pointer-events-none opacity-60 transition-opacity"
								: "transition-opacity"
						}
					>
						{activities && activities.length > 0 ? (
							<div className="flex flex-col items-start justify-start gap-4">
								{activities.map((activity) => (
									<ActivityCard
										key={activity.id}
										activity={activity}
									/>
								))}
							</div>
						) : hasActiveFilters ? (
							<Empty href={`/dashboard/activities`} />
						) : (
							<Empty
								title="Nenhuma atividade encontrada"
								description="Crie uma nova atividade para que ela apareça aqui!"
							/>
						)}
					</div>

					<DashboardPagination
						currentPage={parsedParams.page || 1}
						totalPages={pageCount}
						prefix={`/activities`}
					/>
				</div>

				<div className="order-first space-y-4 md:order-last md:col-span-1">
					<Button asChild className="w-full" size="lg">
						<Link href={`/dashboard/activities/create`}>
							<Plus className="mr-2 h-4 w-4" /> Adicionar
							atividade
						</Link>
					</Button>

					<ReleaseRegistrationsDialog projectId={projectId} />

					<FiltersPanel>
						<Filter
							type="checkbox"
							prefix="category"
							title="Filtrar por Categoria"
							items={activityCategories.map((category) => ({
								value: category,
								name: activityCategoryLabels[
									category as keyof typeof activityCategoryLabels
								],
							}))}
						/>
					</FiltersPanel>
				</div>
			</div>
		</div>
	);
}
