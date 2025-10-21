import { redirect } from "next/navigation";
import { Suspense } from "react";

// Components
import { Settings } from "lucide-react";
import * as EventContainer from "@/components/landing/event-container";
import { Button } from "@/components/ui/button";
import { ParticipantCardDialog } from "@/components/dialogs/participant-card-dialog";
import { ParticipantCard } from "@/components/participant/participant-card";
import AccountLoading from "./skeleton";
import { AccountWrapper } from "@/components/account-wrapper";

// Utils
import { getCachedActivitiesFromParticipant } from "@/lib/data";
import { auth } from "@verific/auth";

async function AccountContent({
	eventUrl,
	userId,
}: {
	eventUrl: string;
	userId: string;
}) {
	const data = await getCachedActivitiesFromParticipant(eventUrl, userId);
	const { activities, participantId } = data;

	return (
		<AccountWrapper
			eventUrl={eventUrl}
			activities={activities}
			participantId={participantId}
		/>
	);
}

export default async function EventAccountPage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;
	const session = await auth();

	const userId = session?.user.id;

	if (!userId) {
		redirect(`/${eventUrl}`);
	}

	let participantId: string | null = null;

	try {
		const data = await getCachedActivitiesFromParticipant(eventUrl, userId);
		participantId = data.participantId;
	} catch (error: any) {
		console.error("Error fetching participant:", error);
		redirect(`/${eventUrl}/subscribe`);
	}

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

			<Suspense fallback={<AccountLoading />}>
				<AccountContent eventUrl={eventUrl} userId={userId} />
			</Suspense>
		</EventContainer.Holder>
	);
}
