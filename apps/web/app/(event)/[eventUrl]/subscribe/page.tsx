import { redirect } from "next/navigation";

// Icons
import { Calendar } from "lucide-react";

// Components
import JoinForm from "@/components/forms/JoinForm";
import * as EventContainer from "@/components/landing/event-container";

// API
import { auth } from "@verific/auth";
import { serverClient } from "@/lib/trpc/server";

export default async function EventSubscribePage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;

	const { project: event, isParticipant } = await serverClient.getProject({
		url: eventUrl,
	});

	console.log("isParticipant", isParticipant);

	if (isParticipant) {
		redirect(`/${eventUrl}/my`);
	}

	if (!event.isRegistrationEnabled) {
		redirect(`/${eventUrl}`);
	}

	const session = await auth();

	return (
		<EventContainer.Holder>
			<EventContainer.Hero
				coverUrl={event.coverUrl || "/images/hero-bg.png"}
			>
				<div className="z-10 flex flex-1 flex-col items-center justify-center">
					<h1 className="mb-4 text-5xl font-bold text-white">
						Inscreva-se em <br />
						{event.name}
					</h1>
					<div className="mb-4 flex items-center text-lg text-white/90">
						<Calendar className="mr-2 h-4.5 w-4.5" />
						<span className="-mt-0.5 text-base">
							De {event.startDate.toLocaleDateString("pt-BR")} a{" "}
							{event.endDate.toLocaleDateString("pt-BR")}
						</span>
					</div>
				</div>
			</EventContainer.Hero>
			<EventContainer.Content>
				<JoinForm
					user={session?.user || undefined}
					projectId={event.id}
					projectUrl={event.url}
					projectLogo={event.logoUrl || undefined}
				/>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
