import { cookies } from "next/headers";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Participantes",
};

// Components
import { DashboardPagination } from "@/components/dashboard/pagination";
import { FiltersPanel } from "@/components/dashboard/filters-panel";
import { SearchBar } from "@/components/search-bar";
import { SortBy } from "@/components/sort-by";
import { Filter } from "@/components/dashboard/filter";
import { ParticipantListItem } from "@/components/participant/participant-item";
import { Empty } from "@/components/empty";

// Validation
import { z } from "@verific/zod";
import { getParticipantsParams } from "@verific/api/routers/participants";

// API
import { serverClient } from "@/lib/trpc/server";
import { getCachedParticipants } from "@/lib/data";

type ParticipantsPageParams = z.infer<typeof getParticipantsParams>;

export default async function ParticipantsPage(props: {
	searchParams: Promise<ParticipantsPageParams>;
}) {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")!.value;

	const searchParams = await props.searchParams;
	const parsedParams = getParticipantsParams.parse(searchParams);

	const { participants, pageCount, emailDomains, courses } =
		await getCachedParticipants({
			projectId,
			...parsedParams,
		});

	return (
		<div className="container-d py-container-v min-h-screen">
			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div className="w-full space-y-4 md:col-span-2">
					<div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
						<div className="relative w-full md:flex-1">
							<SearchBar placeholder="Pesquisar participantes..." />
						</div>
						<SortBy
							sortBy={parsedParams.sort}
							items={[
								{ value: "desc", label: "Mais recentes" },
								{ value: "asc", label: "Mais antigas" },
								{ value: "name_asc", label: "Nome A-Z" },
								{ value: "name_desc", label: "Nome Z-A" },
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
					</Suspense>

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
						<Filter
							type="checkbox"
							prefix="course"
							title="Filtrar por Curso"
							items={courses.slice(1).map((course) => ({
								value: course,
								name: course,
							}))}
						/>
					</FiltersPanel>
				</div>
			</div>
		</div>
	);
}
