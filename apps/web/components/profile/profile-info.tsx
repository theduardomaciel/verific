import { CakeIcon, GraduationCapIcon, MapPinIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { RouterOutput } from "@verific/api";
import {
	PLACEHOLDER_BADGES_COUNT,
	PLACEHOLDER_CONNECTIONS,
} from "@/lib/profile-placeholders";

type PublicProfile = RouterOutput["getPublicProfile"];

interface ProfileInfoProps {
	data: PublicProfile;
}

/**
 * Blocos "Seu perfil" (server, só dados públicos; nulos são ocultos):
 * cartão de informações, adesivos e conexões (placeholders centralizados).
 */
export function ProfileInfo({ data }: ProfileInfoProps) {
	const infoRows: Array<{ icon: React.ReactNode; text: string } | null> = [
		data.birth
			? {
					icon: <CakeIcon size={24} />,
					text: `${data.birth.age} anos, ${data.birth.formatted}`,
				}
			: null,
		data.city ? { icon: <MapPinIcon size={24} />, text: data.city } : null,
		data.institution
			? { icon: <GraduationCapIcon size={24} />, text: data.institution }
			: null,
	];
	const visibleRows = infoRows.filter(
		(r): r is { icon: React.ReactNode; text: string } => r !== null,
	);

	return (
		<div className="flex flex-col items-start justify-center gap-6">
			<div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
				{visibleRows.length > 0 && (
					<Card className="rounded-3xl p-6 font-medium md:p-9">
						<ul className="flex flex-col gap-4">
							{visibleRows.map((row, i) => (
								<li
									key={i}
									className="flex flex-row items-center justify-start gap-3"
								>
									{row.icon}
									<span>{row.text}</span>
								</li>
							))}
						</ul>
					</Card>
				)}
				<div className="from-secondary/60 to-primary/50 flex flex-row items-center justify-between gap-6 rounded-3xl bg-linear-to-l p-6 md:p-9">
					<span className="text-xl font-medium text-white">
						<span className="text-3xl font-semibold">Adesivos</span> <br />
						Coletados
					</span>
					<span className="mx-auto text-5xl font-bold text-white md:pl-24">
						{PLACEHOLDER_BADGES_COUNT}
					</span>
				</div>
			</div>
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
		</div>
	);
}
