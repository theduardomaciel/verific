import Link from "next/link";

import { formatInstant } from "@verific/drizzle/time";

import { useEventTimeZone } from "@/components/event-time-zone";

import {
	getSessionsDateString,
	getSessionTimeString,
	getTimeString,
} from "@/lib/date";
import { cn } from "@/lib/utils";

import type { Conflict } from "@/lib/schedule/conflicts";

const MAX_LINES = 3;

interface ConflictListProps {
	conflicts: Conflict[];
	eventUrl: string;
	className?: string;
}

function conflictLine(conflict: Conflict, timeZone: string): string {
	const session = conflict.otherSession;
	const date = getSessionsDateString(
		[
			{
				startsAt: session.startsAt,
				endsAt: session.endsAt ?? session.startsAt,
			},
		],
		timeZone,
	);
	const weekday = formatInstant(session.startsAt, timeZone, {
		weekday: "long",
	});
	const time = session.endsAt
		? getSessionTimeString(
				{ startsAt: session.startsAt, endsAt: session.endsAt },
				timeZone,
			)
		: getTimeString(new Date(session.startsAt), timeZone, true);
	return `${date} (${weekday}) · ${time}`;
}

/**
 * Lista compartilhada de conflitos (nomes com link + horários,
 * máximo 3 linhas com "e mais N"): usada pelo estado bloqueado do
 * painel. O texto compacto do card usa só os nomes, direto do array.
 */
export function ConflictList({
	conflicts,
	eventUrl,
	className,
}: ConflictListProps) {
	const timeZone = useEventTimeZone();
	if (conflicts.length === 0) return null;

	const shown = conflicts.slice(0, MAX_LINES);
	const rest = conflicts.length - shown.length;

	return (
		<div className={cn("flex flex-col gap-1 text-sm", className)}>
			<ul className="flex flex-col gap-1">
				{shown.map((conflict) => (
					<li
						key={`${conflict.otherActivity.id}-${new Date(conflict.targetSession.startsAt).getTime()}-${new Date(conflict.otherSession.startsAt).getTime()}`}
					>
						<Link
							href={`/${eventUrl}/schedule/${conflict.otherActivity.id}`}
							prefetch={false}
							className="font-semibold underline underline-offset-4"
						>
							{conflict.otherActivity.name}
						</Link>
						{`: ${conflictLine(conflict, timeZone)}`}
					</li>
				))}
			</ul>
			{rest > 0 ? <p>e mais {rest}</p> : null}
		</div>
	);
}
