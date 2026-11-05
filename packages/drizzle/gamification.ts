import { z } from "@verific/zod";

/**
 * Gamificação por evento (configuração + catálogo de adesivos).
 *
 * Client-safe: só zod aqui — sem `node:crypto` e sem `db`. O objeto de
 * configuração é salvo em `projects.gamification`; o catálogo é código,
 * não dado, para que os adesivos sejam renderizados como SVG determinístico
 * sem upload nem pipeline de imagens.
 */

export const GAMIFICATION_VERSION = 1 as const;

export const gamificationRankingSchema = z.object({
	/** Quantidade de posições exibidas na página pública. */
	top: z.number().int().min(3).max(100).default(50),
	allowOptOut: z.boolean().default(true),
	includeStaff: z.boolean().default(false),
	/**
	 * Ranking público: qualquer visitante vê a página e o link no cabeçalho.
	 * Quando `false`, a página responde só para dono/moderadores (e o link
	 * some da navegação).
	 */
	isPublic: z.boolean().default(true),
});

export const gamificationPresenceSchema = z.object({
	firstCheckinPoints: z.number().int().min(0).max(10_000).default(50),
	dailyEnabled: z.boolean().default(true),
	dailyPoints: z.number().int().min(0).max(10_000).default(25),
});

export const gamificationSessionsSchema = z.object({
	perHour: z.number().int().min(0).max(10_000).default(100),
	checkoutEnabled: z.boolean().default(false),
	completionBonus: z.number().int().min(0).max(10_000).default(20),
	completionGraceMinutes: z.number().int().min(0).max(120).default(10),
});

export const gamificationConfigSchema = z.object({
	version: z.literal(GAMIFICATION_VERSION).default(GAMIFICATION_VERSION),
	enabled: z.boolean().default(false),
	rankingEnabled: z.boolean().default(true),
	stickersEnabled: z.boolean().default(true),
	ranking: gamificationRankingSchema.default({
		top: 50,
		allowOptOut: true,
		includeStaff: false,
		isPublic: true,
	}),
	presence: gamificationPresenceSchema.default({
		firstCheckinPoints: 50,
		dailyEnabled: true,
		dailyPoints: 25,
	}),
	sessions: gamificationSessionsSchema.default({
		perHour: 100,
		checkoutEnabled: false,
		completionBonus: 20,
		completionGraceMinutes: 10,
	}),
	enrollmentPoints: z.number().int().min(0).max(10_000).default(10),
});

export type GamificationConfig = z.infer<typeof gamificationConfigSchema>;
export type GamificationRankingConfig = z.infer<
	typeof gamificationRankingSchema
>;
export type GamificationPresenceConfig = z.infer<
	typeof gamificationPresenceSchema
>;
export type GamificationSessionsConfig = z.infer<
	typeof gamificationSessionsSchema
>;

export const DEFAULT_GAMIFICATION_CONFIG: GamificationConfig =
	gamificationConfigSchema.parse({});

/** Sempre devolve uma configuração válida (fallback = padrão). */
export function parseGamificationConfig(input: unknown): GamificationConfig {
	const parsed = gamificationConfigSchema.safeParse(input ?? {});
	return parsed.success ? parsed.data : DEFAULT_GAMIFICATION_CONFIG;
}

/** `true` só quando o organizador ligou a gamificação do evento. */
export function isGamificationEnabled(input: unknown): boolean {
	return parseGamificationConfig(input).enabled;
}

/* -------------------------------------------------------------------------- */
/*                                  Pontos                                    */
/* -------------------------------------------------------------------------- */

/** Fontes de pontos — o ledger guarda a origem de cada lançamento. */
export type PointEventSource =
	| "checkin"
	| "daily"
	| "session"
	| "completion"
	| "enrollment"
	| "manual";

export type StickerSource = "auto" | "manual";

/** Duração agendada de uma sessão, em horas (nunca negativa). */
export function sessionHours(
	startsAt: Date | string | number,
	endsAt: Date | string | number,
): number {
	const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
	return ms > 0 ? ms / 3_600_000 : 0;
}

/** Arredonda o valor de uma sessão para inteiro (mesma regra do ledger). */
export function sessionPoints(input: {
	startsAt: Date | string | number;
	endsAt: Date | string | number;
	perHour: number;
}): number {
	const points = sessionHours(input.startsAt, input.endsAt) * input.perHour;
	if (!Number.isFinite(points) || points <= 0) return 0;
	return Math.round(points);
}

/**
 * Horas efetivamente presentes dentro da janela da sessão.
 * Usado para estatísticas e para o ajuste opcional por tempo real.
 */
export function attendedSessionHours(input: {
	startsAt: Date | string | number;
	endsAt: Date | string | number;
	joinedAt: Date | string | number;
	leftAt?: Date | string | number | null;
}): number {
	const sessionStart = new Date(input.startsAt).getTime();
	const sessionEnd = new Date(input.endsAt).getTime();
	if (
		!Number.isFinite(sessionStart) ||
		!Number.isFinite(sessionEnd) ||
		sessionEnd <= sessionStart
	) {
		return 0;
	}

	const joined = new Date(input.joinedAt).getTime();
	const left = input.leftAt ? new Date(input.leftAt).getTime() : sessionEnd;
	if (!Number.isFinite(joined) || !Number.isFinite(left)) return 0;

	const start = Math.max(sessionStart, joined);
	const end = Math.min(sessionEnd, left);
	return end > start ? (end - start) / 3_600_000 : 0;
}

/**
 * Concluiu a sessão: entrou perto do início e saiu perto do fim.
 * A tolerância evita punir pequenos atrasos/adiantamentos.
 */
export function isSessionCompleted(input: {
	startsAt: Date | string | number;
	endsAt: Date | string | number;
	joinedAt: Date | string | number | null | undefined;
	leftAt: Date | string | number | null | undefined;
	graceMinutes?: number;
}): boolean {
	if (!input.joinedAt || !input.leftAt) return false;

	const grace = Math.max(0, input.graceMinutes ?? 10) * 60_000;
	const startLimit = new Date(input.startsAt).getTime() + grace;
	const endLimit = new Date(input.endsAt).getTime() - grace;
	const joined = new Date(input.joinedAt).getTime();
	const left = new Date(input.leftAt).getTime();

	if (
		!Number.isFinite(startLimit) ||
		!Number.isFinite(endLimit) ||
		!Number.isFinite(joined) ||
		!Number.isFinite(left)
	) {
		return false;
	}

	return joined <= startLimit && left >= endLimit;
}

/* -------------------------------------------------------------------------- */
/*                              Adesivos                                      */
/* -------------------------------------------------------------------------- */

export const STICKER_ICON_KEYS = [
	"qr-code",
	"compass",
	"timer",
	"users",
	"sunrise",
	"trophy",
	"calendar-check",
	"calendar-days",
	"flag",
] as const;
export type StickerIconKey = (typeof STICKER_ICON_KEYS)[number];

export type StickerTier = "bronze" | "silver" | "gold";

export type StickerCriterion =
	| { type: "checkin" }
	| { type: "sessions"; count: number }
	| { type: "hours"; hours: number }
	| { type: "connections"; count: number }
	| { type: "early-session"; beforeHour: number }
	| { type: "rank"; max: number }
	| { type: "days"; count: number; minEventDays: number }
	| { type: "all-days"; minEventDays: number }
	| { type: "completed-sessions"; count: number };

export interface StickerDefinition {
	key: string;
	name: string;
	description: string;
	icon: StickerIconKey;
	tier: StickerTier;
	criterion: StickerCriterion;
	/** Só aparece quando o organizador ligou o checkout. */
	requiresCheckout?: boolean;
}

export const GAMIFICATION_STICKERS: readonly StickerDefinition[] = [
	{
		key: "checkin",
		name: "Credenciado",
		description: "Fez o primeiro check-in no evento.",
		icon: "qr-code",
		tier: "bronze",
		criterion: { type: "checkin" },
	},
	{
		key: "explorer",
		name: "Explorador",
		description: "Participou de 3 sessões.",
		icon: "compass",
		tier: "silver",
		criterion: { type: "sessions", count: 3 },
	},
	{
		key: "marathon",
		name: "Maratonista",
		description: "Acumulou 8 horas de sessões.",
		icon: "timer",
		tier: "gold",
		criterion: { type: "hours", hours: 8 },
	},
	{
		key: "connector",
		name: "Conector",
		description: "Recebeu 10 visitas no perfil.",
		icon: "users",
		tier: "silver",
		criterion: { type: "connections", count: 10 },
	},
	{
		key: "early-bird",
		name: "Madrugador",
		description: "Participou de uma sessão antes das 9h.",
		icon: "sunrise",
		tier: "bronze",
		criterion: { type: "early-session", beforeHour: 9 },
	},
	{
		key: "elite",
		name: "Elite",
		description: "Entrou no top 10 do evento.",
		icon: "trophy",
		tier: "gold",
		criterion: { type: "rank", max: 10 },
	},
	{
		key: "frequent",
		name: "Frequente",
		description: "Marcou presença em 3 dias do evento.",
		icon: "calendar-check",
		tier: "silver",
		criterion: { type: "days", count: 3, minEventDays: 3 },
	},
	{
		key: "everyday",
		name: "Todo dia",
		description: "Marcou presença em todos os dias do evento.",
		icon: "calendar-days",
		tier: "gold",
		criterion: { type: "all-days", minEventDays: 2 },
	},
	{
		key: "finisher",
		name: "Até o fim",
		description: "Concluiu 5 sessões até o final.",
		icon: "flag",
		tier: "silver",
		criterion: { type: "completed-sessions", count: 5 },
		requiresCheckout: true,
	},
];

export function stickerByKey(key: string): StickerDefinition | undefined {
	return GAMIFICATION_STICKERS.find((sticker) => sticker.key === key);
}

/** Estatísticas necessárias para calcular progresso de adesivos. */
export interface GamificationStats {
	/** Check-ins de recepção (não inclui presença em sessões). */
	checkins: number;
	/** Dias distintos com check-in ou presença em sessão. */
	distinctDays: number;
	sessions: number;
	hours: number;
	connections: number;
	earlySessions: number;
	completedSessions: number;
	/** Posição atual no ranking (1-based), ou `null` quando fora/opt-out. */
	rank: number | null;
}

export interface StickerContext {
	eventDays: number;
	checkoutEnabled: boolean;
}

export function isStickerAvailable(
	sticker: StickerDefinition,
	context: StickerContext,
): boolean {
	if (sticker.requiresCheckout && !context.checkoutEnabled) return false;
	if (sticker.criterion.type === "days") {
		return context.eventDays >= sticker.criterion.minEventDays;
	}
	if (sticker.criterion.type === "all-days") {
		return context.eventDays >= sticker.criterion.minEventDays;
	}
	return true;
}

export function stickerTarget(
	sticker: StickerDefinition,
	context: StickerContext,
): number {
	const criterion = sticker.criterion;
	switch (criterion.type) {
		case "checkin":
		case "early-session":
		case "rank":
			return 1;
		case "sessions":
		case "connections":
		case "completed-sessions":
			return criterion.count;
		case "hours":
			return criterion.hours;
		case "days":
			return criterion.count;
		case "all-days":
			return Math.max(context.eventDays, 1);
	}
}

export function stickerCurrent(
	sticker: StickerDefinition,
	stats: GamificationStats,
): number {
	const criterion = sticker.criterion;
	switch (criterion.type) {
		case "checkin":
			return stats.checkins > 0 ? 1 : 0;
		case "sessions":
			return stats.sessions;
		case "hours":
			return stats.hours;
		case "connections":
			return stats.connections;
		case "early-session":
			return stats.earlySessions > 0 ? 1 : 0;
		case "rank":
			return stats.rank !== null && stats.rank <= criterion.max ? 1 : 0;
		case "days":
		case "all-days":
			return stats.distinctDays;
		case "completed-sessions":
			return stats.completedSessions;
	}
}

export interface StickerProgress {
	available: boolean;
	earned: boolean;
	current: number;
	target: number;
}

export function resolveStickerProgress(
	sticker: StickerDefinition,
	stats: GamificationStats,
	context: StickerContext,
): StickerProgress {
	const available = isStickerAvailable(sticker, context);
	const target = stickerTarget(sticker, context);
	const raw = available ? stickerCurrent(sticker, stats) : 0;
	const current = Math.max(0, Math.min(raw, target));

	return {
		available,
		earned: available && raw >= target,
		current,
		target,
	};
}

export function isStickerEarned(
	sticker: StickerDefinition,
	stats: GamificationStats,
	context: StickerContext,
): boolean {
	return resolveStickerProgress(sticker, stats, context).earned;
}
