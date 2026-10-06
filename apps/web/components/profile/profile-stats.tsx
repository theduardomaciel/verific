import { EyeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PLACEHOLDER_BADGES_COUNT } from "@/lib/profile-placeholders";
import { StatIcon } from "./stat-icons";
import type { StatIconKey } from "@verific/drizzle/profile-layout";

export interface ProfileConnectionsData {
	total: number;
	/** Nomes completos dos visitantes recentes (até ~7). */
	visitors: string[];
}

export interface ProfileStatsData {
	name: string;
	stats: Array<{
		label: string;
		icon: StatIconKey;
		value: string;
		hidden: boolean;
	}>;
	showConnections: boolean;
	showBadges: boolean;
	/** Dono vê itens ocultos marcados (visitantes nunca os recebem). */
	ownerView?: boolean;
	connections?: ProfileConnectionsData;
}

function firstName(full: string): string {
	return full.trim().split(/\s+/)[0] ?? full;
}

function initials(full: string): string {
	const parts = full.trim().split(/\s+/).filter(Boolean);
	const first = parts[0]?.[0] ?? "";
	const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
	return `${first}${second}`.toUpperCase() || "?";
}

/**
 * Blocos "Seu perfil": cartão de stats (0-5 itens, some quando vazio),
 * adesivos (placeholder) e conexões (atrás de toggle). Sem campos
 * estáticos: tudo vem dos links do layout + respostas.
 */
export function ProfileStats({ data }: { data: ProfileStatsData }) {
	const visibleStats = data.ownerView
		? data.stats
		: data.stats.filter((s) => !s.hidden);

	if (
		visibleStats.length === 0 &&
		!data.showConnections &&
		!data.showBadges
	) {
		return null;
	}

	return (
		<div className="flex flex-col items-start justify-center gap-6">
			<div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
				{visibleStats.length > 0 && (
					<Card className="rounded-3xl p-6 font-medium md:p-9">
						<ul className="flex flex-col gap-4">
							{visibleStats.map((row, i) => (
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
									{row.hidden && data.ownerView && (
										<Badge
											variant="outline"
											className="ml-auto"
										>
											<EyeOff className="mr-1 h-3 w-3" />
											Oculto
										</Badge>
									)}
								</li>
							))}
						</ul>
					</Card>
				)}
				{data.showBadges && (
					<div className="from-secondary/60 to-primary/50 flex flex-row items-center justify-between gap-6 rounded-3xl bg-linear-to-l p-6 md:p-9">
						<span className="text-foreground text-xl font-medium">
							<span className="text-3xl font-semibold">
								Adesivos
							</span>{" "}
							<br />
							Coletados
						</span>
						<span className="text-foreground mx-auto text-5xl font-bold md:pl-24">
							{PLACEHOLDER_BADGES_COUNT}
						</span>
					</div>
				)}
			</div>
			{data.showConnections && (
				<ConnectionsCard
					name={data.name}
					connections={data.connections}
				/>
			)}
		</div>
	);
}

/**
 * Conexões incoming: quem visitou este perfil. `total` vem do servidor
 * (cache de minutos); `visitors` é amostra recente p/ nomes/iniciais.
 */
function ConnectionsCard({
	name,
	connections,
}: {
	name: string;
	connections?: ProfileConnectionsData;
}) {
	const total = connections?.total ?? 0;
	const visitors = connections?.visitors ?? [];
	const firstNames = visitors.slice(0, 3).map(firstName);
	const stack = visitors.slice(0, 6).map((v) => ({
		name: v,
		initials: initials(v),
	}));
	const remaining = Math.max(total - stack.length, 0);

	return (
		<Card className="w-full items-start rounded-3xl p-6 md:flex-row md:items-center md:justify-between md:p-9">
			<div className="flex flex-col items-start gap-2">
				<h6 className="text-xl font-semibold">Conexões no evento</h6>
				{total === 0 ? (
					<p className="text-base font-medium">
						<strong>{name}</strong> ainda não tem conexões — hora de
						colocar o networking em dia!
					</p>
				) : (
					<p className="text-base font-medium">
						<strong>{name}</strong> já se conectou com{" "}
						{firstNames.join(", ")}
						{total - firstNames.length > 0 && (
							<>
								{" "}
								e outros {total - firstNames.length}{" "}
								participantes
							</>
						)}
					</p>
				)}
			</div>
			{total > 0 && (
				<ul className="flex flex-row" aria-label="Conexões">
					{stack.map((s) => (
						<li
							key={`${s.name}-${s.initials}`}
							className="not-first:-ml-2"
							title={s.name}
						>
							<span className="bg-background text-foreground flex h-10 w-10 items-center justify-center rounded-full text-xs leading-none font-semibold md:h-16 md:w-16 md:text-lg">
								{s.initials}
							</span>
						</li>
					))}
					{remaining > 0 && (
						<li className="not-first:-ml-2">
							<span className="bg-background text-foreground flex h-10 w-10 items-center justify-center rounded-full text-xs leading-none font-semibold md:h-16 md:w-16 md:text-lg">
								+{remaining}
							</span>
						</li>
					)}
				</ul>
			)}
		</Card>
	);
}
