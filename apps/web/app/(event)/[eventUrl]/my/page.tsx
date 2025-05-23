import { redirect } from "next/navigation";

// Components
import { ActivityTicket } from "@/components/activity/activity-ticket";
import * as EventContainer from "@/components/landing/event-container";

// API
import { serverClient } from "@/lib/trpc/server";
import { Empty } from "@/components/empty";

export default async function EventAccountPage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;

	// TODO: O "role" atualmente é definido por projeto/evento, ao invés de por atividade.
	const { activities, isParticipant, role } =
		await serverClient.getActivitiesFromParticipant({
			projectUrl: eventUrl,
		});

	if (!isParticipant) {
		redirect(`/${eventUrl}/subscribe`);
	}

	return (
		<EventContainer.Holder>
			<EventContainer.Hero coverUrl={"/images/hero-bg.png"}>
				<div className="z-10 flex flex-1 flex-col items-start justify-center">
					<h1 className="mb-4 text-5xl font-bold text-white">
						Sua Conta
					</h1>
					<p className="text-primary-foreground/90 text-base font-semibold md:max-w-md">
						Gerencie seus dados, eventos inscritos e preferências
						com facilidade.
					</p>
				</div>
			</EventContainer.Hero>
			<EventContainer.Content>
				<ul className="container-p mb-8 flex w-full grid-cols-2 flex-col justify-between gap-4 md:gap-12">
					{activities.length > 0 ? (
						activities.map((onActivity) => (
							<li key={onActivity.activityId} className="w-full">
								<ActivityTicket
									onActivity={onActivity}
									role={role!}
								/>
							</li>
						))
					) : (
						<Empty
							title="Nenhuma atividade encontrada"
							description="Você ainda não se inscreveu em nenhuma atividade."
						/>
					)}
				</ul>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
