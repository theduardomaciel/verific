import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Settings } from "lucide-react";
import * as EventContainer from "@/components/landing/event-container";
import { Button } from "@/components/ui/button";
import { ParticipantCardDialog } from "@/components/dialogs/participant-card-dialog";
import { ParticipantCard } from "@/components/participant/participant-card";
import { EditMyAnswersForm } from "@/components/forms/dynamic/EditAnswersForm";
import AccountLoading from "./skeleton";
import { AccountWrapper } from "@/components/account-wrapper";
import { getCachedActivitiesFromParticipant, getProject } from "@/lib/data";
import { getSession } from "@/lib/session";

async function AccountContent({
	data,
	eventUrl,
}: {
	data: Awaited<
		ReturnType<typeof getCachedActivitiesFromParticipant>
	>;
	eventUrl: string;
}) {
	return (
		<AccountWrapper
			eventUrl={eventUrl}
			activities={data.activities}
			participantId={data.participantId}
		/>
	);
}

async function EventAccountContent({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;
	const session = await getSession();
	const userId = session?.user.id;

	if (!userId) {
		redirect(`/${eventUrl}`);
	}

	let participantData;

	try {
		participantData =
			await getCachedActivitiesFromParticipant(eventUrl, userId);
	} catch {
		redirect(`/${eventUrl}/subscribe`);
	}

	const projectResult = await getProject(eventUrl);
	const projectId = projectResult?.project.id;

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
				{participantData.participantId && (
					<ParticipantCardDialog
						trigger={
							<Button className="z-20" size={"lg"}>
								<Settings className="mr-2" />
								Configurações da Conta
							</Button>
						}
					>
						<ParticipantCard
							id={participantData.participantId}
							eventUrl={eventUrl}
						/>
					</ParticipantCardDialog>
				)}
			</EventContainer.Hero>

			<Suspense fallback={<AccountLoading />}>
				<AccountContent data={participantData} eventUrl={eventUrl} />
			</Suspense>
			{projectId && (
				<EventContainer.Content>
					<div className="container-p flex w-full flex-col">
						<EditMyAnswersForm projectId={projectId} />
					</div>
				</EventContainer.Content>
			)}
		</EventContainer.Holder>
	);
}

export default function EventAccountPage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	return (
		<Suspense fallback={<AccountLoading />}>
			<EventAccountContent params={params} />
		</Suspense>
	);
}
