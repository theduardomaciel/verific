"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoutForm } from "@/components/ui/logout-form";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";
import { useSearchParams } from "next/navigation";
import { EditProfileDialog } from "./edit-profile-dialog";

interface ProfileOwnerActionsProps {
	eventUrl: string;
	projectId: string;
	shortId: string;
}

/**
 * Ações do dono no banner (slot absoluto, sem shift): "Editar perfil"
 * (diálogo com respostas da inscrição + privacidade) e "Sair".
 * Invisível para visitantes e sem hint (nenhum fetch de sessão).
 */
export function ProfileOwnerActions({
	eventUrl,
	projectId,
	shortId,
}: ProfileOwnerActionsProps) {
	const searchParams = useSearchParams();
	const hasHint = searchParams.get("me") !== null;
	const session = authClient.useSession();
	const userId = session.data?.user.id;
	const myProfile = trpc.getMyProfileData.useQuery(
		{ projectUrl: eventUrl },
		{ enabled: hasHint && Boolean(userId) },
	);

	if (!hasHint) return null;
	if (session.isPending || (userId && myProfile.isPending)) {
		return (
			<div className="absolute top-8 right-8 z-20 flex gap-2">
				<Skeleton className="h-11 w-36 rounded-full" />
			</div>
		);
	}

	const data = myProfile.data;
	if (!data || data.shortId !== shortId) return null;

	return (
		<div className="absolute top-8 right-8 z-20 flex gap-2">
			<EditProfileDialog
				eventUrl={eventUrl}
				projectId={projectId}
				shortId={shortId}
			/>
			<LogoutForm redirectTo={`/${eventUrl}`}>
				<Button type="submit" variant="outline" size="lg" className="rounded-full">
					<LogOut className="h-4 w-4" />
					Sair
				</Button>
			</LogoutForm>
		</div>
	);
}
