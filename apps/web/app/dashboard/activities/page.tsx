import { Suspense } from "react";

// Icons
import { Plus } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { ActivityList } from "@/components/dashboard/activities/activity-list";
import { ActivityPagination } from "@/components/dashboard/activities/activity-pagination";
import { SearchBar } from "@/components/dashboard/search-bar";
import { SortBy } from "@/components/dashboard/sort-by";
import { FiltersPanel } from "@/components/dashboard/filters-panel";
import { Filter } from "@/components/dashboard/filter";

// Data
import {
	getActivities,
	getCategories,
	getMonitors,
	getStatuses,
} from "@/lib/data";

// Validation
import type { z } from "zod";
import { getActivitiesParams } from "@verific/api/routers/activities";

type EventsPageParams = z.infer<typeof getActivitiesParams>;

export default async function ActivitiesPage(props: {
	searchParams: Promise<EventsPageParams>;
}) {
	const searchParams = await props.searchParams;
	const parsedParams = getActivitiesParams.parse(searchParams);

	// Obtemos os dados de exemplo (serão reais após implementar o back)
	// Utilizamos funções com um atraso artificial para simular a latência da rede
	const activities = await getActivities(parsedParams);
	const categories = await getCategories();
	const statuses = await getStatuses();
	const monitors = await getMonitors();

	return (
		<div className="px-dashboard py-8 min-h-screen">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="md:col-span-2 space-y-4 w-full">
					<div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
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
							<div className="h-96 flex items-center justify-center">
								Carregando atividades...
							</div>
						}
					>
						<ActivityList activities={activities} />
					</Suspense>

					<ActivityPagination currentPage={parsedParams.page} totalPages={5} />
				</div>

				<div className="md:col-span-1 space-y-4 order-first md:order-last">
					<Button className="w-full" size="lg">
						<Plus className="mr-2 h-4 w-4" /> Adicionar atividade
					</Button>

					<FiltersPanel>
						<Filter
							type="checkbox"
							prefix="category"
							title="Filtrar por Categoria"
							items={categories.map((category) => ({
								value: category.id,
								name: category.label,
							}))}
						/>
						<Filter
							type="checkbox"
							prefix="status"
							title="Filtrar por Status"
							items={statuses.map((status) => ({
								value: status.id,
								name: status.label,
							}))}
						/>
					</FiltersPanel>
				</div>
			</div>
		</div>
	);
}
