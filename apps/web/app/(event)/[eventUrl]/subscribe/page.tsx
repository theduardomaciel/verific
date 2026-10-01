import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Calendar } from "lucide-react";

import JoinForm from "@/components/forms/JoinForm";
import * as EventContainer from "@/components/landing/event-container";

import { getSession } from "@/lib/session";
import { getCachedCheckParticipantEnrollment, getProject } from "@/lib/data";

async function SubscribeContent({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;
	const session = await getSession();
	const result = await getProject(eventUrl);

	if (!result?.project) {
		notFound();
	}

	const { project } = result;

	if (!project.isRegistrationEnabled) {
		redirect(`/${eventUrl}`);
	}

	const userId = session?.user.id;
	const isParticipant = userId
		? await getCachedCheckParticipantEnrollment(eventUrl, userId)
		: false;

	if (isParticipant) {
		redirect(`/${eventUrl}/my`);
	}

	return (
		<EventContainer.Holder>
			<EventContainer.Hero
				coverUrl={project.coverUrl || "/images/hero-bg.png"}
			>
				<div className="z-10 flex flex-1 flex-col items-center justify-center">
					<h1 className="mb-4 text-5xl font-bold text-white">
						Inscreva-se em <br />
						{project.name}
					</h1>
					<div className="mb-4 flex items-center text-lg text-white/90">
						<Calendar className="mr-2 h-4.5 w-4.5" />
						<span className="-mt-0.5 text-base">
							De{" "}
							{new Date(project.startDate).toLocaleDateString(
								"pt-BR",
							)}{" "}
							a{" "}
							{new Date(project.endDate).toLocaleDateString(
								"pt-BR",
							)}
						</span>
					</div>
				</div>
			</EventContainer.Hero>
			<EventContainer.Content>
				<JoinForm
					user={session?.user}
					project={{
						id: project.id,
						url: project.url,
						logo: project.logoUrl || undefined,
						colors: [
							project.primaryColor,
							project.secondaryColor,
						].filter(Boolean) as string[],
					}}
				/>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}

export default function EventSubscribePage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	return (
		<Suspense fallback={<div className="min-h-[50vh]" />}>
			<SubscribeContent params={params} />
		</Suspense>
	);
}
