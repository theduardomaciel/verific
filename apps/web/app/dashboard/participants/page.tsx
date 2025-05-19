import { Suspense } from "react";
import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Participantes",
};

// Components
import { DashboardPagination } from "@/components/dashboard/pagination";
import { FiltersPanel } from "@/components/dashboard/filters-panel";
import { SearchBar } from "@/components/dashboard/search-bar";
import { SortBy } from "@/components/dashboard/sort-by";
import { Filter } from "@/components/dashboard/filter";
import { ParticipantCard } from "@/components/dashboard/participant-card";
import { Empty } from "@/components/empty";

// Validation
import { z } from "zod";
import { getParticipantsParams } from "@verific/api/routers/participants";

// Data
import { getParticipants } from "@/lib/data";

type ParticipantsPageParams = z.infer<typeof getParticipantsParams>;

export default async function ParticipantsPage(props: {
	searchParams: Promise<ParticipantsPageParams>;
}) {
	const searchParams = await props.searchParams;
	const parsedParams = getParticipantsParams.parse(searchParams);

	const participants = await getParticipants(parsedParams);

	const domains = Array.from(
		new Set(
			participants.map(
				(participant) => participant.user.email.split("@")[1]!,
			),
		),
	);

	return (
		<div className="container-p py-container min-h-screen">
			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div className="w-full space-y-4 md:col-span-2">
					<div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
						<div className="relative w-full md:flex-1">
							<SearchBar placeholder="Pesquisar participantes..." />
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
								Carregando participantes...
							</div>
						}
					>
						{participants && participants.length > 0 ? (
							<div className="flex flex-col items-start justify-start gap-4">
								{participants.map((participant) => (
									<ParticipantCard
										participant={participant}
										participantCardHref={`/dashboard/participants/${participant.id}`}
										key={participant.id}
									/>
								))}
							</div>
						) : (
							<Empty />
						)}
					</Suspense>

					<DashboardPagination
						currentPage={parsedParams.page || 0}
						totalPages={5}
						prefix="participants"
					/>
				</div>

				<div className="order-first space-y-4 md:order-last md:col-span-1">
					<FiltersPanel>
						<Filter
							type="checkbox"
							prefix="category"
							title="Filtrar por Domínio"
							items={domains.map((domain) => ({
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
