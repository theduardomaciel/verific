import Image from "next/image";
import { Calendar } from "lucide-react";
import { serverClient } from "@/lib/trpc/server";

// Components
import { EventCard } from "@/components/landing/event-card";
import { SearchBar } from "@/components/dashboard/search-bar";
import { SortBy } from "@/components/dashboard/sort-by";

export default async function EventSchedulePage({
	params,
}: {
	params: Promise<{ eventId: string }>;
}) {
	const { eventId } = await params;

	const event = await serverClient.getProject({ id: eventId });

	const { activities } = await serverClient.getActivities({
		projectId: eventId,
		page: 0,
		pageSize: 20,
	});

	return (
		<main className="bg-background min-h-screen">
			{/* Hero Section */}
			<section className="from-primary bg-primary px-landing border-secondary relative w-full border-b-[10px] py-12">
				<div className="container-p z-10 mx-auto flex w-full flex-col gap-8 md:flex-row">
					<div className="z-10 flex flex-1 flex-col items-start justify-center">
						<div className="mb-4 flex items-center text-lg text-white/90">
							<Calendar className="mr-2 h-4.5 w-4.5" />
							<span className="-mt-0.5 text-base">
								De {event.startDate.toLocaleDateString()} a{" "}
								{event.endDate.toLocaleDateString()}
							</span>
						</div>
						<h1 className="mb-4 text-5xl font-bold text-white">
							Programação
						</h1>
						<p className="text-primary-foreground/90 text-base font-semibold md:max-w-md">
							Acompanhe as próximas atividades de {event.name},
							tanto internas, como externas, e saiba quando
							participar!
						</p>
					</div>
				</div>

				<Image
					src={event.coverUrl || "/images/hero-bg.png"}
					className="z-0 object-cover"
					alt="Background"
					fill
				/>
			</section>
			<div className="px-landing mx-auto flex w-full flex-col items-center justify-center pt-16">
				<div className="container-p mb-8 flex flex-col justify-between gap-4 md:flex-row">
					<SearchBar placeholder="Pesquisar atividades" />
					<div className="flex gap-4">
						<SortBy
							sortBy={"recent"}
							items={[
								{ value: "recent", label: "Mais recentes" },
								{ value: "oldest", label: "Mais antigas" },
								{ value: "alphabetical", label: "Alfabética" },
							]}
						/>
						<SortBy
							sortBy={"all"}
							items={[
								{ value: "all", label: "Todas as categorias" },
								{ value: "workshop", label: "Workshop" },
								{ value: "seminar", label: "Seminário" },
								{ value: "lecture", label: "Palestra" },
								{
									value: "round-table",
									label: "Roda de conversa",
								},
								{ value: "championship", label: "Campeonato" },
							]}
						/>
					</div>
				</div>

				<div className="container-p mb-10">
					<h2 className="mb-4 text-xl font-bold">Atividades</h2>
					<div className="grid gap-6 md:grid-cols-2">
						{activities.map((activity) => (
							<EventCard
								key={activity.id}
								type={activity.category.toUpperCase()}
								title={activity.name}
								description={activity.description || ""}
								presenterName={activity.speaker?.name}
								presenterDesc={activity.speaker?.description}
								availableSpots={
									activity.participantsLimit
										? `${activity.participantsLimit} vagas disponíveis`
										: undefined
								}
								date={activity.dateFrom.toLocaleDateString()}
								time={activity.dateFrom.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
								buttonColor="bg-[#5b15b5]"
								buttonHoverColor="hover:bg-[#4a1194]"
							/>
						))}
					</div>
				</div>
			</div>
		</main>
	);
}
