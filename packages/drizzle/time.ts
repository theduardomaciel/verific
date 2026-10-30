/**
 * Datas e fusos do app. Único lugar com o nome do fuso: o resto recebe o
 * fuso como parâmetro, vindo de `eventTimeZone(project)` ou, onde não há
 * evento, de `DEFAULT_TIME_ZONE`.
 *
 * Três tipos de valor circulam: instante (`Date`), dia (`"YYYY-MM-DD"`) e
 * hora de relógio (`"HH:mm"`). Client-safe: sem `db`.
 */

export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

/** Dia de calendário, `"YYYY-MM-DD"`. */
export type DayKey = string;
/** Hora de relógio, `"HH:mm"`. */
export type WallTime = string;

type Instant = Date | string | number;

const DAY_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const WALL_TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Dia válido; "2026-02-31", que o `Date` aceitaria como 03/03, não é. */
export function isDayKey(value: unknown): value is DayKey {
	return (
		typeof value === "string" &&
		DAY_KEY_REGEX.test(value) &&
		addDays(value, 0) === value
	);
}

/** Fuso de um evento. Ainda não há fuso por evento. */
export function eventTimeZone(_project: object): string {
	return DEFAULT_TIME_ZONE;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(
	locale: string,
	options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
	const key = `${locale}|${JSON.stringify(options)}`;
	let cached = formatters.get(key);
	if (!cached) {
		cached = new Intl.DateTimeFormat(locale, options);
		formatters.set(key, cached);
	}
	return cached;
}

function zonedParts(instant: Instant, timeZone: string) {
	const parts = formatter("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(new Date(instant));
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? "";
	return {
		year: get("year"),
		month: get("month"),
		day: get("day"),
		hour: get("hour"),
		minute: get("minute"),
		second: get("second"),
	};
}

/** Dia do instante no fuso; `""` para datas inválidas. */
export function dayKey(instant: Instant, timeZone: string): DayKey {
	if (Number.isNaN(new Date(instant).getTime())) return "";
	const { year, month, day } = zonedParts(instant, timeZone);
	return `${year}-${month}-${day}`;
}

/** Minutos desde a meia-noite: "14:30" → 870. */
export function minutesOf(time: WallTime): number {
	const [hour, minute] = time.split(":").map(Number);
	return hour! * 60 + minute!;
}

/** Dia e hora de relógio do instante no fuso. */
export function toWallTime(
	instant: Instant,
	timeZone: string,
): { day: DayKey; time: WallTime } {
	const { year, month, day, hour, minute } = zonedParts(instant, timeZone);
	return { day: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

/** Diferença entre o relógio do fuso e o UTC no instante, em ms. */
function offsetAt(ms: number, timeZone: string): number {
	const p = zonedParts(ms, timeZone);
	const asUtc = Date.UTC(
		Number(p.year),
		Number(p.month) - 1,
		Number(p.day),
		Number(p.hour),
		Number(p.minute),
		Number(p.second),
	);
	return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Instante em que o relógio do fuso marca `day` às `time`. */
export function zonedInstant(
	day: DayKey,
	time: WallTime,
	timeZone: string,
): Date {
	const [year, month, date] = day.split("-").map(Number);
	const [hour, minute] = time.split(":").map(Number);
	const wall = Date.UTC(year!, month! - 1, date!, hour!, minute!);
	// A segunda passada acerta o deslocamento perto de mudanças de horário
	const first = wall - offsetAt(wall, timeZone);
	return new Date(wall - offsetAt(first, timeZone));
}

export function addDays(day: DayKey, days: number): DayKey {
	const [year, month, date] = day.split("-").map(Number);
	return new Date(Date.UTC(year!, month! - 1, date! + days))
		.toISOString()
		.slice(0, 10);
}

/** Dias de `first` a `last`, inclusive; vazio quando `last < first`. */
export function daysBetween(first: DayKey, last: DayKey): DayKey[] {
	const days: DayKey[] = [];
	for (let day = first; day <= last; day = addDays(day, 1)) days.push(day);
	return days;
}

/**
 * Primeiro e último dia de um período: o último é o dia do instante anterior
 * ao fim, então um fim às 00:00 não conta aquele dia.
 */
export function periodDays(
	start: Instant,
	end: Instant,
	timeZone: string,
): { first: DayKey; last: DayKey } | null {
	const startMs = new Date(start).getTime();
	const endMs = new Date(end).getTime();
	if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
	return {
		first: dayKey(startMs, timeZone),
		last: dayKey(Math.max(startMs, endMs - 1), timeZone),
	};
}

/** Todos os dias do evento, pela regra de `periodDays`. */
export function eventDays(project: {
	startDate: Instant;
	endDate: Instant;
}): DayKey[] {
	const days = periodDays(
		project.startDate,
		project.endDate,
		eventTimeZone(project),
	);
	return days ? daysBetween(days.first, days.last) : [];
}

/* ------------------------- Seletores de calendário ------------------------- */

// Os calendários trabalham com `Date` na meia-noite local do navegador; esse
// `Date` só carrega o dia escolhido, nunca um instante.

export function calendarDate(day: DayKey): Date {
	const [year, month, date] = day.split("-").map(Number);
	return new Date(year!, month! - 1, date!);
}

export function dayOfCalendarDate(date: Date): DayKey {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

/* -------------------------------- Formatação ------------------------------- */

/** Formata um instante no fuso. */
export function formatInstant(
	instant: Instant,
	timeZone: string,
	options: Intl.DateTimeFormatOptions,
	locale = "pt-BR",
): string {
	return formatter(locale, { ...options, timeZone }).format(
		new Date(instant),
	);
}

/** Formata um dia; não depende de fuso. */
export function formatDayKey(
	day: DayKey,
	options: Intl.DateTimeFormatOptions,
	locale = "pt-BR",
): string {
	// Meio-dia UTC formatado em UTC: o calendário sem nenhum fuso
	return formatter(locale, { ...options, timeZone: "UTC" }).format(
		new Date(`${day}T12:00:00Z`),
	);
}

/** "14:30" */
export function formatTime(instant: Instant, timeZone: string): string {
	return toWallTime(instant, timeZone).time;
}

/** "14h" ou "14h30" */
export function formatHour(instant: Instant, timeZone: string): string {
	const [hour, minute] = formatTime(instant, timeZone).split(":");
	return minute === "00" ? `${Number(hour)}h` : `${Number(hour)}h${minute}`;
}
