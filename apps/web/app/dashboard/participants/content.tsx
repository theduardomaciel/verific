"use client";

import { keepPreviousData } from "@tanstack/react-query";

// Components
import { DashboardPagination } from "@/components/dashboard/pagination";
import { FiltersPanel } from "@/components/dashboard/filters-panel";
import { SearchBar } from "@/components/search-bar";
import { SortBy } from "@/components/sort-by";
import { Filter } from "@/components/dashboard/filter";
import { ParticipantListItem } from "@/components/participant/participant-item";
import { Empty } from "@/components/empty";
import { Skeleton } from "@/components/ui/skeleton";

// Validation (client-safe: no db / server env imports)
import { getParticipantsParams } from "@verific/api/schemas";

// Hooks
import { useParsedSearchParams } from "@/hooks/use-parsed-search-params";
import { useDashboard } from "@/components/dashboard/dashboard-context";

// API
import { trpc } from "@/lib/trpc/react";

function ParticipantsSkeleton() {
	return (
		<div className="container-d py-container-v min-h-screen">
			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div className="w-full space-y-4 md:col-span-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-96 w-full" />
				</div>
				<div className="order-first space-y-4 md:order-last md:col-span-1">
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		</div>
	);
}

export function ParticipantsContent() {
	const { projectId } = useDashboard();
	const parsedParams = useParsedSearchParams((raw) =>
		getParticipantsParams.parse(raw),
	);

	const { data, isPending, isError, isFetching } =
		trpc.getParticipants.useQuery(
			{
				projectId,
				...parsedParams,
			},
			{
				placeholderData: keepPreviousData,
				staleTime: 30 * 1000,
				refetchOnWindowFocus: false,
			},
		);

	if (isPending) {
		return <ParticipantsSkeleton />;
	}

	if (isError || !data) {
		return (
			<div className="container-d py-container-v min-h-screen">
				<p className="text-muted-foreground text-sm">
					Não foi possível carregar os participantes. Tente recarregar
					a página.
				</p>
			</div>
		);
	}

	const { participants, pageCount, emailDomains } = data;

	return (
		<div className="container-d py-container-v min-h-screen">
			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div className="w-full space-y-4 md:col-span-2">
					<div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
						<div className="relative w-full md:flex-1">
							<SearchBar placeholder="Pesquisar participantes..." />
						</div>
						<SortBy
							items={[
								{ value: "desc", label: "Mais recentes" },
								{ value: "asc", label: "Mais antigas" },
								{ value: "name_asc", label: "Nome A-Z" },
								{ value: "name_desc", label: "Nome Z-A" },
							]}
						/>
					</div>

					<div
						className={
							isFetching
								? "pointer-events-none opacity-60 transition-opacity"
								: "transition-opacity"
						}
					>
						{participants && participants.length > 0 ? (
							<div className="flex flex-col items-start justify-start gap-4">
								{participants.map((participant) => (
									// oxlint-disable-next-line typescript/unbound-method -- expressão membro JSX (`<A.B />`), não extração de método; sem `this` envolvido.
									<ParticipantListItem.General
										key={participant.id}
										participant={participant}
										url="/dashboard/participants"
									/>
								))}
							</div>
						) : (
							<Empty />
						)}
					</div>

					<DashboardPagination
						currentPage={parsedParams.page || 1}
						totalPages={pageCount}
						prefix="participants"
					/>
				</div>

				<div className="order-first space-y-4 md:order-last md:col-span-1">
					<FiltersPanel>
						<Filter
							type="checkbox"
							prefix="domain"
							title="Filtrar por Domínio"
							items={emailDomains.map((domain) => ({
								value: domain,
								name: domain,
							}))}
						/>
					</FiltersPanel>
				</div>
			</div>
		</div>
	);
}
