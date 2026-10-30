import {
	formatDayKey,
	formatInstant,
	formatTime,
	periodDays,
} from "@verific/drizzle/time";

const LONG_DAY: Intl.DateTimeFormatOptions = {
	day: "2-digit",
	month: "long",
	year: "numeric",
};

/**
 * Formats an already-known event range in pt-BR. Same-day ranges include the
 * time window; multi-day ranges show the first and last days.
 */
export function formatEventDateText(
	startDate: Date,
	endDate: Date,
	timeZone: string,
): string {
	const days = periodDays(startDate, endDate, timeZone);
	if (!days) return "";
	const first = formatDayKey(days.first, LONG_DAY);
	if (days.first === days.last) {
		return `${first}, ${formatTime(startDate, timeZone)} – ${formatTime(endDate, timeZone)}`;
	}
	return `${first} – ${formatDayKey(days.last, LONG_DAY)}`;
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
	timeZone: string,
): string | undefined {
	const ordered = [...sessions].sort(
		(a, b) =>
			new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
	);
	const first = ordered[0];
	if (!first) return undefined;
	const text = formatEventDateText(first.startsAt, first.endsAt, timeZone);
	const extra = ordered.length - 1;
	return extra > 0 ? `${text} e mais ${extra}` : text;
}

/** Deadline text for waitlist offers, e.g. "11 de abril de 2026 às 20:00". */
export function formatDeadlineText(date: Date, timeZone: string): string {
	return `${formatInstant(date, timeZone, LONG_DAY)} às ${formatTime(date, timeZone)}`;
}

/** Location text for an activity: its own address, else the event address. */
export function formatLocationText(
	activityAddress: string | null | undefined,
	eventAddress: string | null | undefined,
): string | undefined {
	return activityAddress?.trim() || eventAddress?.trim() || undefined;
}
