import type { Metadata } from "next";

import { ParticipantCard } from "@/components/participant/participant-card";

export const metadata: Metadata = {
	title: "Participante",
};

export default async function ParticipantPage(props: {
	params: Promise<{ participantId: string }>;
}) {
	const { participantId } = await props.params;

	return (
		<main className="container-d py-container-v flex min-h-screen flex-col items-center justify-start">
			<div className="bg-card flex w-full max-w-[600px] flex-col items-center gap-6 rounded-lg border p-6">
				<ParticipantCard id={participantId} />
			</div>
		</main>
	);
}
