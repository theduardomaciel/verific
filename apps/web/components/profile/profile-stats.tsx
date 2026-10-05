import { EyeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
	PLACEHOLDER_BADGES_COUNT,
	PLACEHOLDER_CONNECTIONS,
} from "@/lib/profile-placeholders";
import { StatIcon } from "./stat-icons";
import type { StatIconKey } from "@verific/drizzle/profile-layout";

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
										<Badge variant="outline" className="ml-auto">
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
						<span className="text-xl font-medium text-white">
							<span className="text-3xl font-semibold">Adesivos</span> <br />
							Coletados
						</span>
						<span className="mx-auto text-5xl font-bold text-white md:pl-24">
							{PLACEHOLDER_BADGES_COUNT}
						</span>
					</div>
				)}
			</div>
			{data.showConnections && (
				<Card className="w-full items-start rounded-3xl p-6 md:flex-row md:items-center md:justify-between md:p-9">
					<div className="flex flex-col items-start gap-2">
						<h6 className="text-xl font-semibold">Conexões no evento</h6>
						<p className="text-base font-medium">
							<strong>{data.name}</strong> já se conectou com{" "}
							{PLACEHOLDER_CONNECTIONS.firstNames.join(", ")} e outros{" "}
							{PLACEHOLDER_CONNECTIONS.total -
								PLACEHOLDER_CONNECTIONS.firstNames.length}{" "}
							participantes
						</p>
					</div>
					<ul className="flex flex-row" aria-label="Conexões">
						{PLACEHOLDER_CONNECTIONS.stackInitials.map((initials) => (
							<li key={initials} className="not-first:-ml-2">
								<span className="bg-background text-foreground flex h-10 w-10 items-center justify-center rounded-full text-xs leading-none font-semibold md:h-16 md:w-16 md:text-lg">
									{initials}
								</span>
							</li>
						))}
						<li className="not-first:-ml-2">
							<span className="bg-background text-foreground flex h-10 w-10 items-center justify-center rounded-full text-xs leading-none font-semibold md:h-16 md:w-16 md:text-lg">
								+{PLACEHOLDER_CONNECTIONS.remaining}
							</span>
						</li>
					</ul>
				</Card>
			)}
		</div>
	);
}
