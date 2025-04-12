import { Suspense } from "react";

// Icons
import { Plus } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { ActivityList } from "@/components/dashboard/activities/activity-list";
import { ActivityFilters } from "@/components/dashboard/activities/activity-filters";
import { ActivitySearch } from "@/components/dashboard/activities/activity-search";
import { ActivityPagination } from "@/components/dashboard/activities/activity-pagination";

// Data
import {
	getActivities,
	getCategories,
	getMonitors,
	getStatuses,
} from "@/lib/data";

export default async function ActivitiesPage({
	searchParams,
}: {
	searchParams: { [key: string]: string | string[] | undefined };
}) {
	// Obtemos os parâmetros de pesquisa da URL
	const query =
		typeof searchParams.query === "string" ? searchParams.query : "";
	const sort =
		typeof searchParams.sort === "string" ? searchParams.sort : "recent";
	const page =
		typeof searchParams.page === "string"
			? Number.parseInt(searchParams.page)
			: 1;
	const categoryIds = searchParams.categories
		? Array.isArray(searchParams.categories)
			? searchParams.categories
			: [searchParams.categories]
		: [];
	const statusIds = searchParams.statuses
		? Array.isArray(searchParams.statuses)
			? searchParams.statuses
			: [searchParams.statuses]
		: [];
	const monitorIds = searchParams.monitors
		? Array.isArray(searchParams.monitors)
			? searchParams.monitors
			: [searchParams.monitors]
		: [];

	// Obtém os dados (seriam reais funções de busca de dados em um aplicativo real)
	// Funções simuladas de busca de dados com atraso artificial
	const activities = await getActivities({
		query,
		sort,
		page,
		categoryIds,
		statusIds,
		monitorIds,
	});
	const categories = await getCategories();
	const statuses = await getStatuses();
	const monitors = await getMonitors();

	return (
		<div className="mx-auto py-6 px-4 md:px-6">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="md:col-span-2 space-y-4">
					<ActivitySearch defaultQuery={query} defaultSort={sort} />

					<Suspense
						fallback={
							<div className="h-96 flex items-center justify-center">
								Loading activities...
							</div>
						}
					>
						<ActivityList activities={activities} />
					</Suspense>

					<ActivityPagination currentPage={page} totalPages={5} />
				</div>

				<div className="md:col-span-1 space-y-4 order-first md:order-last">
					<Button className="w-full" size="lg">
						<Plus className="mr-2 h-4 w-4" /> Adicionar atividade
					</Button>

					<ActivityFilters
						categories={categories}
						statuses={statuses}
						monitors={monitors}
						defaultSelectedCategories={categoryIds}
						defaultSelectedStatuses={statusIds}
						defaultSelectedMonitors={monitorIds}
					/>
				</div>
			</div>
		</div>
	);
}
