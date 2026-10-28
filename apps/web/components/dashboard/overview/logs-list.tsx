import { CalendarCheck, ScanLine, UserPlus } from "lucide-react";

import type { RouterOutput } from "@verific/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { cn } from "@/lib/utils";

type LogEntry = RouterOutput["getActivityLog"]["entries"][number];

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
});

const ENTRY_LABELS: Record<
	LogEntry["type"],
	{ icon: typeof UserPlus; label: string }
> = {
	enrollment: { icon: UserPlus, label: "Inscrição em atividade" },
	"activity-checkin": { icon: CalendarCheck, label: "Credenciamento" },
	"reception-checkin": { icon: ScanLine, label: "Check-in na recepção" },
};

export function LogsList({
	entries,
	className,
}: {
	entries: LogEntry[];
	className?: string;
}) {
	return (
		<Card className={cn("flex min-h-0 flex-1 flex-col gap-2", className)}>
			<CardHeader className="shrink-0">
				<CardTitle className="text-base font-medium">
					Log de atividades e recepção
				</CardTitle>
			</CardHeader>
			<CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
				{entries.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nenhum registro ainda.
					</p>
				) : (
					<ul className="divide-border flex flex-col divide-y">
						{entries.map((entry) => {
							const { icon: Icon, label } =
								ENTRY_LABELS[entry.type];
							return (
								<li
									key={entry.id}
									className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
								>
									<span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
										<Icon className="size-4" />
									</span>
									<div className="flex min-w-0 flex-1 flex-col gap-0.5">
										<span className="text-sm font-semibold">
											{entry.participantName}
										</span>
										<span className="text-muted-foreground truncate text-sm">
											{entry.activityName
												? `${label} · ${entry.activityName}`
												: label}
										</span>
										{entry.detail ? (
											<span className="text-muted-foreground text-xs">
												{entry.detail}
											</span>
										) : null}
									</div>
									<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
										{dateFormatter.format(
											new Date(entry.at),
										)}
									</span>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
