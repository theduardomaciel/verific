import Link from "next/link";

// Icons
import { CalendarClock } from "lucide-react";

// Components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Lib
import {
	getSessionsDateString,
	getSessionTimeString,
	getTimeString,
} from "@/lib/date";
import { cn } from "@/lib/utils";

// Types
import type { Conflict } from "@/lib/schedule/conflicts";

const MAX_LINES = 3;

interface ScheduleConflictAlertProps {
	conflicts: Conflict[];
	eventUrl: string;
	id?: string;
	className?: string;
}

function conflictLine(conflict: Conflict): string {
	const session = conflict.otherSession;
	const date = getSessionsDateString([
		{
			startsAt: session.startsAt,
			endsAt: session.endsAt ?? session.startsAt,
		},
	]);
	const weekday = new Date(session.startsAt).toLocaleDateString("pt-BR", {
		weekday: "long",
	});
	const time = session.endsAt
		? getSessionTimeString({
				startsAt: session.startsAt,
				endsAt: session.endsAt,
			})
		: getTimeString(new Date(session.startsAt), true);
	return `${date} (${weekday}) · ${time}`;
}

/**
 * Aviso (nunca bloqueio) de sobreposição com atividades já inscritas:
 * mesmo componente no diálogo de quick join e no painel da página.
 * Sem `role="alert"`: o conteúdo já existe na abertura (vai para
 * `aria-describedby`) ou aparece em fluxo de leitura — nunca é erro.
 */
export function ScheduleConflictAlert({
	conflicts,
	eventUrl,
	id,
	className,
}: ScheduleConflictAlertProps) {
	if (conflicts.length === 0) return null;

	const shown = conflicts.slice(0, MAX_LINES);
	const rest = conflicts.length - shown.length;

	return (
		<Alert
			variant="warning"
			id={id}
			role={undefined} // oxlint-disable-line jsx-a11y/aria-role -- `undefined` intencional: remove o `role="alert"` padrão. O aviso já existe na abertura ou aparece em fluxo de leitura — nunca é erro.
			className={cn(
				"motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
				className,
			)}
		>
			<CalendarClock className="h-4 w-4" />
			<AlertTitle>
				{conflicts.length === 1
					? "Conflito de horário"
					: "Conflitos de horário"}
			</AlertTitle>
			<AlertDescription>
				<ul className="flex flex-col gap-1">
					{shown.map((conflict) => (
						<li
							key={`${conflict.otherActivity.id}-${new Date(conflict.targetSession.startsAt).getTime()}-${new Date(conflict.otherSession.startsAt).getTime()}`}
						>
							<Link
								href={`/${eventUrl}/schedule/${conflict.otherActivity.id}`}
								className="font-semibold underline underline-offset-4"
							>
								{conflict.otherActivity.name}
							</Link>
							{`: ${conflictLine(conflict)}`}
						</li>
					))}
				</ul>
				{rest > 0 ? <p>e mais {rest}</p> : null}
			</AlertDescription>
		</Alert>
	);
}
