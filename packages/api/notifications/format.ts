const saoPauloDay = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "America/Sao_Paulo",
	day: "2-digit",
	month: "long",
	year: "numeric",
});

const saoPauloTime = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "America/Sao_Paulo",
	hour: "2-digit",
	minute: "2-digit",
});

/**
 * Formats an already-known event range in pt-BR (America/Sao_Paulo, the
 * repo-wide convention for event display). Same-day ranges include the time
 * window; multi-day ranges show both dates.
 */
export function formatEventDateText(startDate: Date, endDate: Date): string {
	const start = new Date(startDate);
	const end = new Date(endDate);
	if (saoPauloDay.format(start) === saoPauloDay.format(end)) {
		return `${saoPauloDay.format(start)}, ${saoPauloTime.format(start)} – ${saoPauloTime.format(end)}`;
	}
	return `${saoPauloDay.format(start)} – ${saoPauloDay.format(end)}`;
}

export interface SessionRange {
	startsAt: Date;
	endsAt: Date;
	address?: string | null;
}

/**
 * Human text for an activity's sessions. One session shows the full window;
 * several show the first window and “e mais N”, keeping the e-mail short.
 */
export function formatActivitySessionsText(
	sessions: SessionRange[],
): string | undefined {
	const ordered = [...sessions].sort(
		(a, b) =>
			new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
	);
	const first = ordered[0];
	if (!first) return undefined;
	const text = formatEventDateText(first.startsAt, first.endsAt);
	const extra = ordered.length - 1;
	return extra > 0 ? `${text} e mais ${extra}` : text;
}

const saoPauloDeadline = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "America/Sao_Paulo",
	day: "2-digit",
	month: "long",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

/**
 * Deadline text (America/Sao_Paulo) for waitlist offers, e.g.
 * "11 de abril de 2026 às 20:00".
 */
export function formatDeadlineText(date: Date): string {
	return saoPauloDeadline.format(new Date(date));
}

/** Location text for an activity: its own address, else the event address. */
export function formatLocationText(
	activityAddress: string | null | undefined,
	eventAddress: string | null | undefined,
): string | undefined {
	return activityAddress?.trim() || eventAddress?.trim() || undefined;
}
