import Link from "next/link";
import { notFound, redirect } from "next/navigation";

// Components
import { ExternalLinkIcon, Settings } from "lucide-react";

// Components
import * as EventContainer from "@/components/landing/event-container";
import { ActivityTicket } from "@/components/activity/activity-ticket";
import { Button } from "@/components/ui/button";
import { ParticipantCardDialog } from "@/components/dialogs/participant-card-dialog";
import { ParticipantCard } from "@/components/participant/participant-card";

// API
import { serverClient } from "@/lib/trpc/server";
import { Empty } from "@/components/empty";

// Utils
import { categorizeByDate } from "@/lib/date";

export default async function EventAccountPage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;

	let data;
	try {
		data = await serverClient.getActivitiesFromParticipant({
			projectUrl: eventUrl,
		});
	} catch {
		redirect(`/${eventUrl}/subscribe`);
	}

	const { activities, participantId } = data;

	const { grouped, categories } = categorizeByDate(
		activities,
		(item) => item.dateFrom,
	);

	return (
		<EventContainer.Holder>
			<EventContainer.Hero coverUrl={"/images/hero-bg.png"}>
				<div className="z-10 flex flex-1 flex-col items-start justify-center">
					<h1 className="mb-4 text-5xl font-bold text-white">
						Sua Conta
					</h1>
					<p className="text-primary-foreground text-base font-semibold md:max-w-md">
						Gerencie seus dados, eventos inscritos e preferências
						com facilidade.
					</p>
				</div>
				{participantId && (
					<ParticipantCardDialog
						trigger={
							<Button className="z-20" size={"lg"}>
								<Settings className="mr-2" />
								Configurações da Conta
							</Button>
						}
					>
						<ParticipantCard
							id={participantId}
							eventUrl={eventUrl}
						/>
					</ParticipantCardDialog>
				)}
			</EventContainer.Hero>
			<EventContainer.Content>
				<div className="container-p mb-8 flex w-full flex-col gap-4 md:gap-12">
					{activities.length > 0 ? (
						<>
							<h2 className="text-foreground font-dashboard text-3xl font-semibold">
								Seus eventos
							</h2>
							{categories.map((category) => (
								<div
									key={category}
									className="flex flex-col gap-4"
								>
									<h3 className="text-foreground font-dashboard text-xl font-semibold">
										{category}
									</h3>
									<ul className="flex w-full flex-col gap-4">
										{grouped
											.get(category)!
											.map((activity) => (
												<li
													key={activity.id}
													className="w-full"
												>
													<ActivityTicket
														activity={activity}
														participantId={
															participantId
														}
													/>
												</li>
											))}
									</ul>
								</div>
							))}
						</>
					) : (
						<Empty
							title="Nenhuma atividade encontrada"
							description={
								<div className="flex flex-col items-center justify-center gap-4">
									Você ainda não se inscreveu em nenhuma
									atividade.
									<Button size={"lg"} asChild>
										<Link href={`/${eventUrl}/schedule`}>
											Explore a programação e inscreva-se
											<span className="text-xs">
												<ExternalLinkIcon className="ml-2" />
											</span>
										</Link>
									</Button>
								</div>
							}
						/>
					)}
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
