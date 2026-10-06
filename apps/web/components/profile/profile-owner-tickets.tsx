"use client";

import { AccountWrapper } from "@/components/account-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";
import { useSearchParams } from "next/navigation";

interface ProfileOwnerTicketsProps {
	eventUrl: string;
	shortId: string;
}

/**
 * "Seus eventos" (só dono): ingressos + QR a partir da sessão resolvida.
 * Slot com tamanho reservado enquanto carrega; nada para visitantes.
 */
export function ProfileOwnerTickets({
	eventUrl,
	shortId,
}: ProfileOwnerTicketsProps) {
	const searchParams = useSearchParams();
	const hasHint = searchParams.get("me") !== null;
	const session = authClient.useSession();
	const userId = session.data?.user.id;
	const myProfile = trpc.getMyProfileData.useQuery(
		{ projectUrl: eventUrl },
		{ enabled: hasHint && Boolean(userId) },
	);
	const isOwner = myProfile.data?.shortId === shortId;
	const activities = trpc.getActivitiesFromParticipant.useQuery(
		{ projectUrl: eventUrl },
		{ enabled: isOwner },
	);

	if (!hasHint) return null;
	if (session.isPending || (userId && myProfile.isPending)) {
		return (
			<div className="flex w-full flex-col gap-4">
				<Skeleton className="h-7 w-40" />
				<Skeleton className="min-h-64 w-full" />
			</div>
		);
	}
	if (!isOwner) return null;
	if (activities.isPending) {
		return (
			<div className="flex w-full flex-col gap-4">
				<Skeleton className="h-7 w-40" />
				<Skeleton className="min-h-64 w-full" />
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-4">
			<h2 className="font-heading text-xl font-semibold">Seus eventos</h2>
			<AccountWrapper
				eventUrl={eventUrl}
				activities={activities.data?.activities ?? []}
				participantId={activities.data?.participantId ?? null}
			/>
		</div>
	);
}
