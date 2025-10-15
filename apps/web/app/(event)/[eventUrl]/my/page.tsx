import { redirect } from "next/navigation";

// Components
import { Settings } from "lucide-react";

// Components
import * as EventContainer from "@/components/landing/event-container";
import { ActivityTicket } from "@/components/activity/activity-ticket";
import { Button } from "@/components/ui/button";

// API
import { serverClient } from "@/lib/trpc/server";
import { Empty } from "@/components/empty";

// Utils
import { categorizeByDate } from "@/lib/date-categorization";
import Link from "next/link";
import { ParticipantCardDialog } from "@/components/dialogs/participant-card-dialog";
import { ParticipantCard } from "@/components/participant/participant-card";

export default async function EventAccountPage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;

	// TODO: O "role" atualmente é definido por projeto/evento, ao invés de por atividade.
	const { activities, isParticipant, role, participantId } =
		await serverClient.getActivitiesFromParticipant({
			projectUrl: eventUrl,
		});

	if (!isParticipant) {
		redirect(`/${eventUrl}/subscribe`);
	}

	const { grouped, categories } = categorizeByDate(
		activities,
		(item) => item.activity.dateFrom,
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
							<Button className="z-20">
								<Settings className="mr-2" />
								Configurações da Conta
							</Button>
						}
					>
						<ParticipantCard id={participantId} />
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
									<ul className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
										{grouped
											.get(category)!
											.map((onActivity) => (
												<li
													key={onActivity.activityId}
													className="w-full"
												>
													<ActivityTicket
														onActivity={onActivity}
														role={role!}
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
							description="Você ainda não se inscreveu em nenhuma atividade."
						/>
					)}
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
