"use client";

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
import { useSearchParams } from "next/navigation";
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
 */
export function ProfileOwnerSection({
	eventUrl,
	shortId,
	children,
}: ProfileOwnerSectionProps) {
	const [open, setOpen] = useState(true);
	const searchParams = useSearchParams();
	const hasHint = searchParams.get("me") !== null;
	const session = authClient.useSession();
	const userId = session.data?.user.id;
	const myProfile = trpc.getMyProfileData.useQuery(
		{ projectUrl: eventUrl },
		{ enabled: hasHint && Boolean(userId) },
	);

	const isOwner = myProfile.data?.shortId === shortId;

	if (
		!hasHint ||
		(!session.isPending && !userId) ||
		(myProfile.data && !isOwner)
	) {
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
					<CollapsibleTrigger className="flex items-center gap-3 text-xl font-semibold">
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
