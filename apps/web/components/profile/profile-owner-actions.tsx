"use client";

import { useSearchParams } from "next/navigation";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoutForm } from "@/components/ui/logout-form";
import { Skeleton } from "@/components/ui/skeleton";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";

import { EditProfileDialog } from "./edit-profile-dialog";

interface ProfileOwnerActionsProps {
	eventUrl: string;
	projectId: string;
	shortId: string;
}

/**
 * Ações do dono no banner (slot absoluto, sem shift): "Editar perfil"
 * (diálogo com respostas da inscrição + privacidade) e "Sair".
 * No mobile empilham no canto superior direito para não sobrepor o avatar;
 * do `md` para cima ficam em linha. Invisível para visitantes e sem hint
 * (nenhum fetch de sessão).
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
		// Dois botões `size="lg"` (h-10): o esqueleto reserva a mesma altura.
		return (
			<div className="absolute top-8 right-8 z-20 flex flex-col items-end gap-2 md:flex-row md:items-center">
				<Skeleton className="h-10 w-32 rounded-full" />
				<Skeleton className="h-10 w-20 rounded-full" />
			</div>
		);
	}

	const data = myProfile.data;
	if (!data || data.shortId !== shortId) return null;

	return (
		<div className="absolute top-8 right-8 z-20 flex flex-col items-end gap-2 md:flex-row md:items-center">
			<EditProfileDialog
				eventUrl={eventUrl}
				projectId={projectId}
				shortId={shortId}
			/>
			<LogoutForm redirectTo={`/${eventUrl}`}>
				<Button
					type="submit"
					variant="outline"
					size="lg"
					className="rounded-full"
				>
					<LogOut className="h-4 w-4" />
					Sair
				</Button>
			</LogoutForm>
		</div>
	);
}
