"use client";

import { useSearchParams } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";

import { AccountWrapper } from "@/components/account-wrapper";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";

interface ProfileOwnerTicketsProps {
	eventUrl: string;
	shortId: string;
}

/**
 * "Seus eventos" (só dono): ingressos + QR a partir da sessão resolvida.
 * Slot com tamanho reservado enquanto carrega; nada para visitantes.
 */
export function ProfileOwnerTickets(props: ProfileOwnerTicketsProps) {
	const searchParams = useSearchParams();

	// Visitante sem `?me`: nenhum fetch de sessão/atividades.
	if (searchParams.get("me") === null) return null;

	return <ProfileOwnerTicketsInner {...props} />;
}

function ProfileOwnerTicketsInner({
	eventUrl,
	shortId,
}: ProfileOwnerTicketsProps) {
	const session = authClient.useSession();
	const userId = session.data?.user.id;
	const myProfile = trpc.getMyProfileData.useQuery(
		{ projectUrl: eventUrl },
		{ enabled: Boolean(userId) },
	);
	const isOwner = myProfile.data?.shortId === shortId;
	const activities = trpc.getActivitiesFromParticipant.useQuery(
		{ projectUrl: eventUrl },
		{ enabled: isOwner },
	);

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
			<h2 className="font-subtitle text-xl font-bold">Seus eventos</h2>
			<AccountWrapper
				eventUrl={eventUrl}
				activities={activities.data?.activities ?? []}
				checkInCode={activities.data?.shortId ?? null}
				checkoutEnabled={
					activities.data?.gamification.checkoutEnabled ?? false
				}
			/>
		</div>
	);
}
