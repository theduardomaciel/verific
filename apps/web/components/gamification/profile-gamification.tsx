"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import { StickerSeal } from "./sticker-seal";

interface ProfileGamificationProps {
	eventUrl: string;
	shortId: string;
	rankingEnabled: boolean;
	stickersEnabled: boolean;
}

function formatPoints(value: number): string {
	return value.toLocaleString("pt-BR");
}

function Metric({
	label,
	value,
	hint,
	className,
}: {
	label: string;
	value: string;
	hint?: string;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-col gap-1", className)}>
			<span className="text-foreground/70 text-xs font-semibold tracking-wide uppercase">
				{label}
			</span>
			<span className="text-foreground text-3xl font-bold tabular-nums">
				{value}
			</span>
			{hint && <span className="text-foreground/70 text-xs">{hint}</span>}
		</div>
	);
}

/**
 * Cartão público de gamificação no perfil. Ilha client: pontos e ranking
 * mudam a cada check-in, então não podem morar no shell ISR.
 */
export function ProfileGamification({
	eventUrl,
	shortId,
	rankingEnabled,
	stickersEnabled,
}: ProfileGamificationProps) {
	const query = trpc.getParticipantGamification.useQuery(
		{ projectUrl: eventUrl, shortId },
		{
			staleTime: 30_000,
			refetchOnWindowFocus: true,
			retry: false,
		},
	);

	if (query.isPending) {
		return <Skeleton className="h-44 w-full rounded-3xl" aria-hidden />;
	}
	if (query.isError || !query.data) return null;

	const data = query.data;
	const stickers = data.stickers.filter((sticker) => sticker.available);
	const earned = stickers.filter((sticker) => sticker.earned).length;
	const showRank = rankingEnabled && !data.optOut;

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="from-secondary/60 to-primary/50 flex w-full flex-col gap-6 rounded-3xl bg-linear-to-l p-6 md:p-9">
				<div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
					<Metric
						label="Pontos"
						value={formatPoints(data.points)}
						hint="no evento"
					/>
					{showRank && (
						<Metric
							label="Posição"
							value={data.rank ? `#${data.rank}` : "—"}
							hint={
								data.totalParticipants > 0
									? `de ${data.totalParticipants} pontuando`
									: "ranking vazio"
							}
						/>
					)}
					{!showRank && rankingEnabled && data.optOut && (
						<Metric
							label="Ranking"
							value="Fora"
							hint="você optou por não aparecer"
						/>
					)}
					{stickersEnabled && (
						<Metric
							label="Adesivos"
							value={`${earned}/${stickers.length}`}
							hint="coletados"
						/>
					)}
				</div>
			</div>

			{stickersEnabled && stickers.length > 0 && (
				<Card className="w-full rounded-3xl p-6 md:p-9">
					<div className="mb-6 flex flex-row items-baseline justify-between gap-4">
						<h6 className="text-xl font-semibold">Sua coleção</h6>
						<span className="text-muted-foreground text-sm">
							{earned} de {stickers.length} adesivos
						</span>
					</div>
					<ul className="flex flex-row flex-wrap items-start gap-4">
						{stickers.map((sticker) => (
							<li key={sticker.key}>
								<StickerSeal
									sticker={sticker}
									className={
										sticker.earned
											? undefined
											: "opacity-90"
									}
								/>
							</li>
						))}
					</ul>
				</Card>
			)}
		</div>
	);
}
