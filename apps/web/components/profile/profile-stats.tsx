import { EyeOff } from "lucide-react";

import type { StatIconKey } from "@verific/drizzle/profile-layout";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import {
	ConnectionsCard,
	type ProfileConnectionsData,
} from "./profile-connections";
import { StatIcon } from "./stat-icons";

export type { ProfileConnectionsData };

export interface ProfileStatsData {
	/** Perfil de onde vem a lista completa de conexões (ausente na prévia). */
	profile?: { eventUrl: string; shortId: string };
	name: string;
	stats: Array<{
		label: string;
		icon: StatIconKey;
		value: string;
		hidden: boolean;
	}>;
	showConnections: boolean;
	/** Dono vê itens ocultos marcados (visitantes nunca os recebem). */
	ownerView?: boolean;
	connections?: ProfileConnectionsData;
}

/**
 * Blocos "Seu perfil": cartão de stats (0-5 itens, some quando vazio) e
 * conexões (atrás de toggle). Sem campos estáticos: tudo vem dos links do
 * layout + respostas. Adesivos/pontos vivem em `ProfileGamification`.
 */
export function ProfileStats({ data }: { data: ProfileStatsData }) {
	const visibleStats = data.ownerView
		? data.stats
		: data.stats.filter((s) => !s.hidden);

	if (visibleStats.length === 0 && !data.showConnections) {
		return null;
	}

	return (
		<div className="flex flex-col items-start justify-center gap-6">
			{visibleStats.length > 0 && (
				<Card className="w-full rounded-3xl p-6 font-medium md:p-9">
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
			{data.showConnections && (
				<ConnectionsCard
					profile={data.profile}
					name={data.name}
					connections={data.connections}
				/>
			)}
		</div>
	);
}
