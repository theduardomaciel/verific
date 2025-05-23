import Link from "next/link";

import { cookies } from "next/headers";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Atividades",
};

// Icons
import { Plus } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { DashboardPagination } from "@/components/dashboard/pagination";
import { SearchBar } from "@/components/dashboard/search-bar";
import { SortBy } from "@/components/dashboard/sort-by";
import { FiltersPanel } from "@/components/dashboard/filters-panel";
import { Filter } from "@/components/dashboard/filter";
import { Empty } from "@/components/empty";
import { ActivityCard } from "@/components/dashboard/activity-card";

// Validation
import type { z } from "zod";
import { getActivitiesParams } from "@verific/api/routers/activities";

type ActivitiesPageParams = z.infer<typeof getActivitiesParams>;

// API
import { serverClient } from "@/lib/trpc/server";
import {
	activityCategories,
	activityCategoryLabels,
} from "@verific/drizzle/schema";

export default async function ActivitiesPage(props: {
	searchParams: Promise<ActivitiesPageParams>;
	params: Promise<{ projectId: string }>;
}) {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")!.value;

	const searchParams = await props.searchParams;
	const parsedParams = getActivitiesParams.parse(searchParams);

	const { activities } = await serverClient.getActivities({
		projectId,
		...parsedParams,
	});

	return (
		<div className="container-d py-container-v min-h-screen">
			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div className="w-full space-y-4 md:col-span-2">
					<div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
						<div className="relative w-full md:flex-1">
							<SearchBar placeholder="Pesquisar atividades..." />
						</div>
						<SortBy
							sortBy={parsedParams.sort}
							items={[
								{ value: "recent", label: "Mais recentes" },
								{ value: "oldest", label: "Mais antigas" },
								{ value: "alphabetical", label: "Alfabética" },
							]}
						/>
					</div>

					<Suspense
						fallback={
							<div className="flex h-96 items-center justify-center">
								Carregando atividades...
							</div>
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
						) : searchParams.query ? (
							<Empty
								href={`/dashboard/${projectId}/activities`}
							/>
						) : (
							<Empty
								title="Nenhuma atividade encontrada"
								description="Crie uma nova atividade para que ela apareça aqui!"
							/>
						)}
					</Suspense>

					<DashboardPagination
						currentPage={parsedParams.page || 1}
						totalPages={5}
						prefix={`/${projectId}/activities`}
					/>
				</div>

				<div className="order-first space-y-4 md:order-last md:col-span-1">
					<Button asChild className="w-full" size="lg">
						<Link
							href={`/dashboard/${projectId}/activities/create`}
						>
							<Plus className="mr-2 h-4 w-4" /> Adicionar
							atividade
						</Link>
					</Button>

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
						{/* <Filter
							type="checkbox"
							prefix="status"
							title="Filtrar por Status"
							items={statuses.map((status) => ({
								value: status.id,
								name: status.label,
							}))}
						/> */}
					</FiltersPanel>
				</div>
			</div>
		</div>
	);
}
