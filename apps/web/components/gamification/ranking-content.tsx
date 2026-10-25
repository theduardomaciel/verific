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
	},
	2: {
		card: "border-slate-300/70 bg-slate-50/60 dark:bg-slate-900/40",
		badge: "bg-slate-300 text-slate-900",
		height: "md:mt-8",
	},
	3: {
		card: "border-orange-400/50 bg-orange-50/50 dark:bg-orange-950/20",
		badge: "bg-orange-300 text-orange-950",
		height: "md:mt-12",
	},
} as const;

function PodiumCard({ row, eventUrl }: { row: RankingRow; eventUrl: string }) {
	const style = PODIUM_STYLES[row.rank as 1 | 2 | 3] ?? PODIUM_STYLES[3];
	return (
		<Link
			href={`/${eventUrl}/profile/${row.shortId}`}
			className="group flex-1"
			aria-label={`${row.name}, ${row.points} pontos, posição ${row.rank}`}
		>
			<Card
				className={cn(
					"relative items-center gap-3 border px-4 py-6 text-center transition-shadow hover:shadow-md",
					style.card,
					style.height,
				)}
			>
				<span
					className={cn(
						"absolute -top-3 flex size-7 items-center justify-center rounded-full text-xs font-bold shadow-sm",
						style.badge,
					)}
				>
					{row.rank}
				</span>
				{row.rank === 1 && (
					<Crown className="size-5 text-amber-500" aria-hidden />
				)}
				<Avatar row={row} className="size-16 text-lg" />
				<div className="flex flex-col items-center">
					<span className="max-w-36 truncate text-sm font-semibold">
						{row.name}
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
				className="bg-card hover:bg-muted/40 flex items-center gap-4 rounded-2xl border px-4 py-3 transition-colors"
				aria-label={`${row.name}, ${row.points} pontos, posição ${row.rank}`}
			>
				<span className="text-muted-foreground w-8 text-right text-sm font-semibold tabular-nums">
					{row.rank}
				</span>
				<Avatar row={row} className="size-10" />
				<span className="min-w-0 flex-1 truncate text-sm font-medium">
					{row.name}
				</span>
				<span className="text-foreground text-sm font-bold tabular-nums">
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
			<div className="flex flex-col items-center gap-4 py-16">
				<Loader2 className="text-muted-foreground size-8 animate-spin" />
				<p className="text-muted-foreground text-sm">
					Carregando ranking…
				</p>
			</div>
		);
	}

	if (ranking.isError) {
		return (
			<p className="text-muted-foreground py-16 text-center text-sm">
				Não foi possível carregar o ranking agora.
			</p>
		);
	}

	const rows = ranking.data?.rows ?? [];
	const total = ranking.data?.total ?? 0;

	if (rows.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 py-16 text-center">
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
		<div className="flex w-full flex-col gap-10">
			<div className="flex flex-row items-end justify-center gap-3">
				{[top[1], top[0], top[2]]
					.filter((row): row is RankingRow => Boolean(row))
					.map((row) => (
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
