"use client";

import Link from "next/link";

import { Crown, Loader2, Trophy } from "lucide-react";

import type { RouterOutput } from "@verific/api";

import { Card } from "@/components/ui/card";

import { getInitials } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

function formatPoints(value: number): string {
	return value.toLocaleString("pt-BR");
}

interface RankingRow {
	participantId: string;
	shortId: string;
	name: string;
	avatarUrl: string | null;
	points: number;
	rank: number;
}

function Avatar({ row, className }: { row: RankingRow; className?: string }) {
	if (row.avatarUrl) {
		return (
			// oxlint-disable-next-line next/no-img-element -- avatar remoto do usuário.
			<img
				src={row.avatarUrl}
				alt=""
				className={cn("rounded-full object-cover", className)}
			/>
		);
	}
	return (
		<span
			className={cn(
				"bg-secondary text-secondary-foreground flex items-center justify-center rounded-full text-sm font-bold",
				className,
			)}
			aria-hidden
		>
			{getInitials(row.name) ?? "?"}
		</span>
	);
}

const PODIUM_STYLES = {
	1: {
		card: "border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/20",
		badge: "bg-amber-400 text-amber-950",
		height: "md:mt-0",
		order: "md:order-2",
	},
	2: {
		card: "border-slate-300/70 bg-slate-50/60 dark:bg-slate-900/40",
		badge: "bg-slate-300 text-slate-900",
		height: "md:mt-8",
		order: "md:order-1",
	},
	3: {
		card: "border-orange-400/50 bg-orange-50/50 dark:bg-orange-950/20",
		badge: "bg-orange-300 text-orange-950",
		height: "md:mt-12",
		order: "md:order-3",
	},
} as const;

function PodiumCard({ row, eventUrl }: { row: RankingRow; eventUrl: string }) {
	const style = PODIUM_STYLES[row.rank as 1 | 2 | 3] ?? PODIUM_STYLES[3];
	return (
		<Link
			href={`/${eventUrl}/profile/${row.shortId}`}
			className={cn("group w-full md:w-auto md:flex-1", style.order)}
			aria-label={`${row.name}, ${row.points} pontos, posição ${row.rank}`}
		>
			<Card
				className={cn(
					// Mobile: card horizontal, empilhado na ordem do ranking.
					"relative flex-row items-center gap-3 border px-3 py-3 text-center transition-shadow hover:shadow-md",
					// Desktop: pódio em colunas, com alturas escalonadas.
					"md:flex-col md:justify-center md:px-4 md:py-6",
					style.card,
					style.height,
				)}
			>
				<span
					className={cn(
						"flex size-8 shrink-0 items-center justify-center rounded-full text-base font-bold shadow-sm",
						"md:absolute md:-top-3 md:size-7 md:text-xl",
						style.badge,
					)}
				>
					{row.rank}
				</span>
				<Avatar
					row={row}
					className="size-12 shrink-0 text-base md:size-16 md:text-lg"
				/>
				<div className="flex min-w-0 flex-1 flex-col items-start md:flex-none md:items-center">
					<span className="flex max-w-full min-w-0 items-center gap-1 text-sm font-semibold md:max-w-36 md:justify-center">
						{row.rank === 1 && (
							<Crown
								className="size-4 shrink-0 text-amber-500 md:size-5"
								aria-hidden
							/>
						)}
						<span className="truncate">{row.name}</span>
					</span>
					<span className="text-muted-foreground text-xs tabular-nums">
						{formatPoints(row.points)} pts
					</span>
				</div>
			</Card>
		</Link>
	);
}

function RankingRowItem({
	row,
	eventUrl,
}: {
	row: RankingRow;
	eventUrl: string;
}) {
	return (
		<li>
			<Link
				href={`/${eventUrl}/profile/${row.shortId}`}
				className="bg-card hover:bg-muted/40 flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors sm:min-h-0 sm:gap-4 sm:px-4 sm:py-3"
				aria-label={`${row.name}, ${row.points} pontos, posição ${row.rank}`}
			>
				<span className="text-muted-foreground w-6 shrink-0 text-center text-xs font-semibold tabular-nums sm:w-8 sm:text-right sm:text-sm">
					{row.rank}
				</span>
				<Avatar
					row={row}
					className="size-9 shrink-0 text-sm sm:size-10"
				/>
				<span className="min-w-0 flex-1 truncate text-sm font-medium">
					{row.name}
				</span>
				<span className="text-foreground shrink-0 text-xs font-bold whitespace-nowrap tabular-nums sm:text-sm">
					{formatPoints(row.points)} pts
				</span>
			</Link>
		</li>
	);
}

export function RankingContent({
	eventUrl,
	initialData,
}: {
	eventUrl: string;
	initialData?: RouterOutput["getEventRanking"];
}) {
	// Ranking é informação não crítica: a página entrega o valor cacheado no
	// servidor, sem polling e sem nenhuma leitura por visitante (a antiga
	// `getMyStanding` custava um snapshot completo para cada visitante
	// logado). Invalidações de gamificação atualizam quem está com a tela
	// aberta.
	const ranking = trpc.getEventRanking.useQuery(
		{ projectUrl: eventUrl },
		{
			initialData,
			staleTime: 5 * 60_000,
			refetchOnWindowFocus: false,
			refetchInterval: false,
		},
	);

	if (ranking.isPending) {
		return (
			<div className="flex flex-col items-center gap-4 py-12 sm:py-16">
				<Loader2 className="text-muted-foreground size-8 animate-spin" />
				<p className="text-muted-foreground text-sm">
					Carregando ranking…
				</p>
			</div>
		);
	}

	if (ranking.isError) {
		return (
			<p className="text-muted-foreground py-12 text-center text-sm sm:py-16">
				Não foi possível carregar o ranking agora.
			</p>
		);
	}

	const rows = ranking.data?.rows ?? [];
	const total = ranking.data?.total ?? 0;

	if (rows.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 px-2 py-12 text-center sm:py-16">
				<Trophy className="text-muted-foreground size-10" />
				<p className="text-foreground font-semibold">
					Ninguém pontuou ainda
				</p>
				<p className="text-muted-foreground max-w-sm text-sm">
					Faça check-in na recepção e participe das atividades para
					aparecer aqui.
				</p>
			</div>
		);
	}

	const top = rows.slice(0, 3);
	const rest = rows.slice(3);

	return (
		<div className="flex w-full flex-col gap-6 sm:gap-10">
			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-center">
				{top.map((row) => (
					<PodiumCard
						key={row.participantId}
						row={row}
						eventUrl={eventUrl}
					/>
				))}
			</div>

			{rest.length > 0 && (
				<ul className="flex flex-col gap-2" aria-label="Classificação">
					{rest.map((row) => (
						<RankingRowItem
							key={row.participantId}
							row={row}
							eventUrl={eventUrl}
						/>
					))}
				</ul>
			)}

			{rows.length < 3 && (
				<p className="text-muted-foreground text-center text-sm">
					O ranking cresce conforme os participantes pontuam.
				</p>
			)}

			<p className="text-muted-foreground text-center text-xs">
				{total}{" "}
				{total === 1
					? "participante pontuando"
					: "participantes pontuando"}
			</p>
		</div>
	);
}
