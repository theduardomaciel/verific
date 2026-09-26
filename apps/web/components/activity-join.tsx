"use client";

import Link from "next/link";

// Components
import { Button } from "@/components/ui/button";
import { JoinActivityDialog } from "@/components/dialogs/join-activity-dialog";

// Icons
import { BookLock, Loader2 } from "lucide-react";

// API
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";
import type { RouterOutput } from "@verific/api";

type Activity = RouterOutput["getActivity"]["activity"];

function useMembership(eventUrl: string) {
	const session = authClient.useSession();
	const userId = session.data?.user.id;

	const participantQuery = trpc.getParticipantIdByProjectUrl.useQuery(
		{ projectUrl: eventUrl },
		{
			enabled: Boolean(userId),
		},
	);

	return {
		userId,
		participantId: participantQuery.data?.participantId ?? null,
		isPending:
			session.isPending ||
			(Boolean(userId) && participantQuery.isPending),
	};
}

function JoinLoading() {
	return (
		<div className="flex min-h-[40vh] items-center justify-center">
			<Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
		</div>
	);
}

function SubscribeCallToAction({ eventUrl }: { eventUrl: string }) {
	return (
		<div className="flex min-h-screen items-center justify-center px-4 py-8">
			<div className="flex flex-col items-center gap-4 text-center">
				<BookLock size={42} className="mb-2" />
				<h1 className="text-2xl font-bold">
					É necessário estar inscrito no evento
				</h1>
				<p className="text-muted-foreground">
					Faça login na plataforma e inscreva-se no evento para
					participar dessa e de outras atividades.
				</p>
				<Button asChild className="w-full">
					<Link href={`/${eventUrl}/subscribe`}>
						Inscrever-se no evento
					</Link>
				</Button>
				<Button variant="outline" className="w-full" asChild>
					<Link href={`/${eventUrl}/schedule`}>Voltar</Link>
				</Button>
			</div>
		</div>
	);
}

export function ActivityJoinPageContent({
	activity,
	eventUrl,
}: {
	activity: Activity;
	eventUrl: string;
}) {
	const { userId, participantId, isPending } = useMembership(eventUrl);

	if (isPending) {
		return <JoinLoading />;
	}

	if (!participantId) {
		return <SubscribeCallToAction eventUrl={eventUrl} />;
	}

	return (
		<div className="flex min-h-screen items-center justify-center px-4 py-8">
			<JoinActivityDialog
				activity={activity}
				userId={userId}
				participantId={participantId}
			/>
		</div>
	);
}

export function ActivityJoinModalContent({
	activity,
	eventUrl,
}: {
	activity: Activity;
	eventUrl: string;
}) {
	const { userId, participantId, isPending } = useMembership(eventUrl);

	if (isPending) {
		return <JoinLoading />;
	}

	return (
		<JoinActivityDialog
			activity={activity}
			userId={userId}
			participantId={participantId}
		/>
	);
}
