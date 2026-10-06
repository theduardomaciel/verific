"use client";

import { EyeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";
import { useSearchParams } from "next/navigation";
import { StatIcon } from "./stat-icons";

/**
 * Itens ocultos no público, visíveis só p/ o dono (com selo).
 * Null p/ visitantes: sem fetch sem hint, sem espaço reservado.
 */
export function ProfileOwnerHidden({
	eventUrl,
	shortId,
}: {
	eventUrl: string;
	shortId: string;
}) {
	const searchParams = useSearchParams();
	const hasHint = searchParams.get("me") !== null;
	const session = authClient.useSession();
	const userId = session.data?.user.id;
	const myData = trpc.getMyProfileData.useQuery(
		{ projectUrl: eventUrl },
		{ enabled: hasHint && Boolean(userId) },
	);

	if (!hasHint) return null;
	if (!myData.data || myData.data.shortId !== shortId) return null;
	const hidden = [
		...(myData.data.slots.subtitle?.hidden
			? [
					{
						label: "Título",
						icon: "star" as const,
						value: myData.data.slots.subtitle.value,
					},
				]
			: []),
		...(myData.data.slots.bio?.hidden
			? [
					{
						label: "Bio",
						icon: "book-open" as const,
						value: myData.data.slots.bio.value,
					},
				]
			: []),
		...myData.data.slots.stats.filter((s) => s.hidden),
		...myData.data.slots.socials
			.filter((s) => s.hidden)
			.map((s) => ({
				label: s.label,
				icon: "globe" as const,
				value: s.url,
			})),
		...(myData.data.slots.email?.hidden
			? [
					{
						label: "E-mail",
						icon: "globe" as const,
						value: myData.data.slots.email.value,
					},
				]
			: []),
	];
	if (hidden.length === 0) return null;

	return (
		<Card className="w-full rounded-3xl p-6 md:p-9">
			<h6 className="mb-4 text-xl font-semibold">Ocultos no público</h6>
			<ul className="flex flex-col gap-4">
				{hidden.map((row, i) => (
					<li
						key={`${row.label}-${i}`}
						className="flex flex-row items-center justify-start gap-3"
					>
						<StatIcon icon={row.icon} />
						<span>
							<span className="text-muted-foreground mr-2 text-sm">
								{row.label}
							</span>
							{row.value}
						</span>
						<Badge variant="outline" className="ml-auto">
							<EyeOff className="mr-1 h-3 w-3" />
							Oculto
						</Badge>
					</li>
				))}
			</ul>
		</Card>
	);
}
