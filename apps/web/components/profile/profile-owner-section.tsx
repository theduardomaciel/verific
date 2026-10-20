"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { ChevronDown } from "lucide-react";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

interface ProfileOwnerSectionProps {
	eventUrl: string;
	shortId: string;
	children: React.ReactNode;
}

/**
 * Cabeçalho colapsável "Seu perfil" (só no dono): envolve o conteúdo
 * público já renderizado (composição server→cliente). Visitantes veem
 * o conteúdo sem o cabeçalho.
 *
 * O gate pelo hint `?me` fica no componente externo: sem ele, a ilha
 * interna (e o `useSession`, que dispara `/api/auth/get-session` no mount)
 * nem monta — visitante comum não paga uma invocação de auth.
 */
export function ProfileOwnerSection(props: ProfileOwnerSectionProps) {
	const searchParams = useSearchParams();

	if (searchParams.get("me") === null) {
		return <>{props.children}</>;
	}

	return <ProfileOwnerSectionInner {...props} />;
}

function ProfileOwnerSectionInner({
	eventUrl,
	shortId,
	children,
}: ProfileOwnerSectionProps) {
	const [open, setOpen] = useState(true);
	const session = authClient.useSession();
	const userId = session.data?.user.id;
	const myProfile = trpc.getMyProfileData.useQuery(
		{ projectUrl: eventUrl },
		{ enabled: Boolean(userId) },
	);

	const isOwner = myProfile.data?.shortId === shortId;

	if ((!session.isPending && !userId) || (myProfile.data && !isOwner)) {
		return <>{children}</>;
	}

	return (
		<div className="flex w-full flex-col gap-6">
			{myProfile.data && isOwner ? (
				<Collapsible
					open={open}
					onOpenChange={setOpen}
					className="w-full"
				>
					<CollapsibleTrigger className="font-subtitle flex items-center gap-3 text-xl font-bold">
						Seu perfil
						<ChevronDown
							className={cn(
								"mt-0.5 h-5 w-5 transition-transform",
								open && "rotate-180",
							)}
						/>
					</CollapsibleTrigger>
					<CollapsibleContent className="pt-6">
						{children}
					</CollapsibleContent>
				</Collapsible>
			) : (
				<>
					<Skeleton className="h-7 w-32" />
					{children}
				</>
			)}
		</div>
	);
}
