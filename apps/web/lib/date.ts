import {
	addDays,
	dayKey,
	formatDayKey,
	formatHour,
	formatInstant,
	formatTime,
} from "@verific/drizzle/time";

export const isDateDifferent = (date1: Date, date2: Date, timeZone: string) =>
	dayKey(date1, timeZone) !== dayKey(date2, timeZone);

const SHORT_DAY: Intl.DateTimeFormatOptions = {
	day: "2-digit",
	month: "2-digit",
};

/** "12/05", ou "12/05 - 14/05" quando os dias diferem. */
export const getDateString = (
	dateFrom: Date,
	dateTo: Date,
	timeZone: string,
) => {
	const from = formatInstant(dateFrom, timeZone, SHORT_DAY);
	return isDateDifferent(new Date(dateFrom), new Date(dateTo), timeZone)
		? `${from} - ${formatInstant(dateTo, timeZone, SHORT_DAY)}`
		: from;
};

/** "14:30", ou "14h30" com `asHourFormat`. */
export const getTimeString = (
	date: Date,
	timeZone: string,
	asHourFormat = false,
) => (asHourFormat ? formatHour(date, timeZone) : formatTime(date, timeZone));

export const isAfterEnd = (endDate: Date) => {
	return new Date() > new Date(endDate);
};

/** True when `now` is between `startDate` and `endDate` (both inclusive). */
export const isWithinPeriod = (
	startDate: Date | string | number,
	endDate: Date | string | number,
	now: Date = new Date(),
): boolean => {
	const start = new Date(startDate).getTime();
	const end = new Date(endDate).getTime();
	if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
	const current = now.getTime();
	return current >= start && current <= end;
};

export function formatWorkload(hours: number | null | undefined): string {
	if (!hours || hours <= 0) return "0m";
	const totalMinutes = Math.round(hours * 60);
	const h = Math.floor(totalMinutes / 60);
	const m = totalMinutes % 60;
	if (h > 0 && m > 0) return `${h}h${m}m`;
	if (h > 0) return `${h}h`;
	return `${m}m`;
}

/* -------------------------------------------------------------------------- */
/*                            Multi-session helpers                           */
/* -------------------------------------------------------------------------- */

export interface ActivitySessionLike {
	startsAt: Date;
	endsAt: Date;
	address?: string | null;
	joinedAt?: Date | null;
}

const toDate = (date: Date | string) => new Date(date);

/** Earliest session start, or null when there are no sessions. */
export const getFirstSessionStart = (
	sessions: ActivitySessionLike[] | undefined | null,
): Date | null => {
	if (!sessions || sessions.length === 0) return null;
	return sessions.reduce(
		(min, s) => (toDate(s.startsAt) < min ? toDate(s.startsAt) : min),
		toDate(sessions[0]!.startsAt),
	);
};

/** Latest session end, or null when there are no sessions. */
export const getLastSessionEnd = (
	sessions: ActivitySessionLike[] | undefined | null,
): Date | null => {
	if (!sessions || sessions.length === 0) return null;
	return sessions.reduce(
		(max, s) => (toDate(s.endsAt) > max ? toDate(s.endsAt) : max),
		toDate(sessions[0]!.endsAt),
	);
};

export const getSessionsSorted = <T extends ActivitySessionLike>(
	sessions: T[] | undefined | null,
): T[] => {
	return [...(sessions ?? [])].sort(
		(a, b) => toDate(a.startsAt).getTime() - toDate(b.startsAt).getTime(),
	);
};

/** "12/05" for one day, "12/05 - 14/05" across days. */
export const getSessionsDateString = (
	sessions: ActivitySessionLike[] | undefined | null,
	timeZone: string,
): string => {
	const sorted = getSessionsSorted(sessions);
	if (sorted.length === 0) return "";
	return getDateString(
		sorted[0]!.startsAt,
		sorted[sorted.length - 1]!.endsAt,
		timeZone,
	);
};

/** "14h - 16h" for a single session. */
export const getSessionTimeString = (
	session: ActivitySessionLike,
	timeZone: string,
	asHourFormat = true,
): string => {
	return `${getTimeString(session.startsAt, timeZone, asHourFormat)} - ${getTimeString(session.endsAt, timeZone, asHourFormat)}`;
};

/** True when `now` falls inside any session. */
export const isSessionLive = (
	session: Pick<ActivitySessionLike, "startsAt" | "endsAt">,
	now: Date = new Date(),
): boolean => {
	return now >= toDate(session.startsAt) && now <= toDate(session.endsAt);
};

export const getLiveSession = <T extends ActivitySessionLike>(
	sessions: T[] | undefined | null,
	now: Date = new Date(),
): T | null => {
	return (
		getSessionsSorted(sessions).find((s) => isSessionLive(s, now)) ?? null
	);
};

export const getNextSession = <T extends ActivitySessionLike>(
	sessions: T[] | undefined | null,
	now: Date = new Date(),
): T | null => {
	return (
		getSessionsSorted(sessions).find((s) => toDate(s.startsAt) > now) ??
		null
	);
};

/** True when every session already ended. */
export const hasEverySessionEnded = (
	sessions: ActivitySessionLike[] | undefined | null,
	now: Date = new Date(),
): boolean => {
	const lastEnd = getLastSessionEnd(sessions);
	return lastEnd !== null && now > lastEnd;
};

/**
 * Expands activities into one occurrence per session, for day-grouped views.
 * Occurrences are sorted by session start.
 */
export function expandSessionOccurrences<
	T extends { sessions?: ActivitySessionLike[] | null },
>(
	activities: T[],
): Array<{
	activity: T;
	session: ActivitySessionLike;
	sessionIndex: number;
	sessionCount: number;
}> {
	return activities
		.flatMap((activity) =>
			getSessionsSorted(activity.sessions).map(
				(session, sessionIndex) => ({
					activity,
					session,
					sessionIndex,
					sessionCount: activity.sessions?.length ?? 0,
				}),
			),
		)
		.sort(
			(a, b) =>
				toDate(a.session.startsAt).getTime() -
				toDate(b.session.startsAt).getTime(),
		);
}

/* --------------- Categorization --------------- */

// `now` nulo (servidor, primeira renderização): sem "Hoje" nem "Amanhã",
// que ficariam congelados no HTML estático
export const isToday = (
	date: Date,
	timeZone: string,
	now: Date | null = new Date(),
) => now !== null && dayKey(date, timeZone) === dayKey(now, timeZone);

export const isTomorrow = (
	date: Date,
	timeZone: string,
	now: Date | null = new Date(),
) =>
	now !== null &&
	dayKey(date, timeZone) === addDays(dayKey(now, timeZone), 1);

/** Agrupa por dia no fuso, em ordem cronológica. */
export function categorizeByDate<T>(
	items: T[],
	getDate: (item: T) => Date,
	timeZone: string,
	now: Date | null = new Date(),
): { grouped: Map<string, T[]>; categories: string[] } {
	const byDay = new Map<string, T[]>();
	for (const item of items) {
		const key = dayKey(getDate(item), timeZone);
		const group = byDay.get(key);
		if (group) group.push(item);
		else byDay.set(key, [item]);
	}

	const today = now ? dayKey(now, timeZone) : null;
	const tomorrow = today ? addDays(today, 1) : null;
	const grouped = new Map<string, T[]>();
	for (const key of [...byDay.keys()].sort()) {
		const category =
			key === today
				? "Hoje"
				: key === tomorrow
					? "Amanhã"
					: formatDayKey(key, { day: "2-digit", month: "long" });
		grouped.set(category, byDay.get(key)!);
	}

	return { grouped, categories: [...grouped.keys()] };
}

export interface FriendlyDateOptions {
	/** Referência para "Hoje"/"Amanhã"; nulo formata sempre a data. */
	now?: Date | null;
	includeDay?: boolean;
	includeHour?: boolean;
	longMonth?: boolean;
}

/**
 * Data amigável no fuso: "Hoje", "Amanhã, 14:30", "12/04" ou
 * "12 de abril, às 14:30".
 */
export function formatFriendlyDate(
	date: Date,
	timeZone: string,
	options?: FriendlyDateOptions,
): string {
	const {
		now = new Date(),
		includeDay = true,
		includeHour = false,
		longMonth = false,
	} = options || {};
	const time = includeHour ? formatTime(date, timeZone) : null;

	if (isToday(date, timeZone, now)) return time ? `Hoje, ${time}` : "Hoje";
	if (isTomorrow(date, timeZone, now)) {
		return time ? `Amanhã, ${time}` : "Amanhã";
	}
	if (!includeDay) return time ?? "";

	const day = formatInstant(
		date,
		timeZone,
		longMonth
			? { day: "2-digit", month: "long" }
			: { day: "numeric", month: "2-digit" },
	);
	return time ? `${day}, às ${time}` : day;
}

/**
 * Rótulo de um grupo dos gráficos: "2026-10-20" vira "20 de out." e
 * "2026-10-20T21:00" vira "21:00". A chave já está no fuso do evento.
 */
export function formatBucketLabel(key: string): string {
	return key.includes("T")
		? key.slice(11, 16)
		: formatDayKey(key, { day: "numeric", month: "short" });
}
