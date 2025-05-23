import { redirect } from "next/navigation";

// Components
import { ActivityTicket } from "@/components/activity/activity-ticket";
import * as EventContainer from "@/components/landing/event-container";

// API
import { serverClient } from "@/lib/trpc/server";

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

	const workshopData = {
		title: "Workshop de Arduino",
		startTime: "9:10 AM",
		endTime: "11:50 AM",
		maxParticipants: 300,
		currentParticipants: 235,
		tolerance: "15m",
		speakerName: "Ranilson Oscar Araujo Paiva",
		speakerRole:
			"Docente no Instituto de Matemática e especialista em validação ético jurídica de modelos de inteligência artificial",
		speakerImage: "https://i.imgur.com/VCaJRG3.jpeg",
		description:
			"Descubra novas abordagens para a Matemática Inclusiva. Junte-se a nós para uma discussão enriquecedora sobre práticas...",
		attendanceTime: "9h15",
	};

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
				<ul className="mb-8 flex w-full grid-cols-2 flex-col justify-between gap-4 md:gap-12">
					{activities.map((onActivity) => (
						<li key={onActivity.activityId} className="w-full">
							<ActivityTicket
								onActivity={onActivity}
								role={role!}
							/>
						</li>
					))}
				</ul>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
