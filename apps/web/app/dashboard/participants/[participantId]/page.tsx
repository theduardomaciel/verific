import type { Metadata } from "next";
import { Suspense } from "react";

import {
	ParticipantCard,
	ParticipantCardSkeleton,
} from "@/components/participant/participant-card";

export const metadata: Metadata = {
	title: "Participante",
};

export default function ParticipantPage(props: {
	params: Promise<{ participantId: string }>;
}) {
	return (
		<main className="container-d py-container-v flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-start">
			<div className="bg-card flex w-full max-w-150 flex-col items-center gap-6 rounded-lg border p-6">
				<Suspense fallback={<ParticipantCardSkeleton />}>
					<ParticipantLoader params={props.params} />
				</Suspense>
			</div>
		</main>
	);
}

async function ParticipantLoader({
	params,
}: {
	params: Promise<{ participantId: string }>;
}) {
	const { participantId } = await params;

	return <ParticipantCard id={participantId} />;
}
