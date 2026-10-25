"use client";

import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { trpc } from "@/lib/trpc/react";

/**
 * Opt-out do ranking público. Só aparece quando o evento permite e o
 * organizador ligou o ranking; a query é pública e falha em silêncio
 * quando a gamificação está desligada.
 */
export function RankingPrivacyToggle({
	projectId,
	eventUrl,
	shortId,
}: {
	projectId: string;
	eventUrl: string;
	shortId: string;
}) {
	const utils = trpc.useUtils();
	const query = trpc.getParticipantGamification.useQuery(
		{ projectUrl: eventUrl, shortId },
		{ retry: false, staleTime: 30_000 },
	);
	const mutation = trpc.setRankingOptOut.useMutation();

	if (!query.data || !query.data.allowOptOut || !query.data.rankingEnabled) {
		return null;
	}

	const visible = !query.data.optOut;

	async function handleChange(next: boolean) {
		try {
			await mutation.mutateAsync({
				projectId,
				optOut: !next,
			});
			await Promise.all([
				utils.getParticipantGamification.invalidate(),
				utils.getEventRanking.invalidate(),
			]);
			toast.success(
				next
					? "Você voltou a aparecer no ranking."
					: "Você não aparece mais no ranking público.",
			);
		} catch {
			toast.error("Não foi possível atualizar sua preferência.");
		}
	}

	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex flex-col gap-1">
				<Label htmlFor="ranking-visible">
					Aparecer no ranking público
				</Label>
				<span className="text-muted-foreground text-xs">
					Seus pontos e adesivos continuam no perfil; só a posição no
					ranking fica oculta.
				</span>
			</div>
			<Switch
				id="ranking-visible"
				checked={visible}
				disabled={mutation.isPending}
				onCheckedChange={(value) => void handleChange(value)}
			/>
		</div>
	);
}
