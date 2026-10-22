import { describe, expect, it } from "vitest";

import {
	DEFAULT_GAMIFICATION_CONFIG,
	attendedSessionHours,
	eventDayCount,
	eventDayKey,
	eventDayKeys,
	isMultiDayEvent,
	isSessionCompleted,
	isStickerAvailable,
	isStickerEarned,
	parseGamificationConfig,
	resolveStickerProgress,
	sessionHours,
	sessionPoints,
	stickerByKey,
	type GamificationStats,
	type StickerContext,
} from "./gamification";

const STATS: GamificationStats = {
	checkins: 1,
	distinctDays: 2,
	sessions: 3,
	hours: 4,
	connections: 0,
	earlySessions: 0,
	completedSessions: 0,
	rank: null,
};

const CONTEXT: StickerContext = { eventDays: 3, checkoutEnabled: false };

describe("gamification config", () => {
	it("aplica padrões", () => {
		const config = parseGamificationConfig(null);
		expect(config).toEqual(DEFAULT_GAMIFICATION_CONFIG);
		expect(config.enabled).toBe(false);
		expect(config.presence.firstCheckinPoints).toBe(50);
		expect(config.presence.dailyPoints).toBe(25);
		expect(config.sessions.perHour).toBe(100);
		expect(config.sessions.checkoutEnabled).toBe(false);
		expect(config.ranking.top).toBe(50);
	});

	it("cai no padrão quando o JSON é inválido", () => {
		expect(parseGamificationConfig({ presence: "nope" })).toEqual(
			DEFAULT_GAMIFICATION_CONFIG,
		);
	});

	it("preserva valores personalizados", () => {
		const config = parseGamificationConfig({
			enabled: true,
			presence: { firstCheckinPoints: 80, dailyPoints: 10 },
			sessions: { checkoutEnabled: true, completionBonus: 0 },
		});
		expect(config.enabled).toBe(true);
		expect(config.presence.firstCheckinPoints).toBe(80);
		expect(config.presence.dailyPoints).toBe(10);
		// Campos omitidos no objeto parcial continuam com o padrão.
		expect(config.presence.dailyEnabled).toBe(true);
		expect(config.sessions.checkoutEnabled).toBe(true);
		expect(config.sessions.completionBonus).toBe(0);
		expect(config.sessions.perHour).toBe(100);
	});
});

describe("event days", () => {
	it("usa o fuso America/Sao_Paulo", () => {
		// 02:00Z = 23:00 do dia anterior em São Paulo.
		expect(eventDayKey("2026-10-22T02:00:00.000Z")).toBe("2026-10-21");
		expect(eventDayKey("2026-10-22T12:00:00.000Z")).toBe("2026-10-22");
	});

	it("lista dias inclusivos", () => {
		expect(
			eventDayKeys(
				"2026-10-21T12:00:00.000Z",
				"2026-10-23T12:00:00.000Z",
			),
		).toEqual(["2026-10-21", "2026-10-22", "2026-10-23"]);
		expect(
			eventDayCount("2026-10-21T12:00:00Z", "2026-10-21T20:00:00Z"),
		).toBe(1);
		expect(
			isMultiDayEvent("2026-10-21T12:00:00Z", "2026-10-22T12:00:00Z"),
		).toBe(true);
	});
});

describe("session points", () => {
	const session = {
		startsAt: "2026-10-21T13:00:00.000Z",
		endsAt: "2026-10-21T15:00:00.000Z",
	};

	it("calcula horas e pontos inteiros", () => {
		expect(sessionHours(session.startsAt, session.endsAt)).toBe(2);
		expect(sessionPoints({ ...session, perHour: 100 })).toBe(200);
		expect(
			sessionPoints({
				startsAt: "2026-10-21T13:00:00.000Z",
				endsAt: "2026-10-21T14:30:00.000Z",
				perHour: 75,
			}),
		).toBe(113);
		expect(
			sessionPoints({
				startsAt: session.endsAt,
				endsAt: session.startsAt,
				perHour: 100,
			}),
		).toBe(0);
	});

	it("limita o tempo presente à janela da sessão", () => {
		expect(
			attendedSessionHours({
				...session,
				joinedAt: "2026-10-21T12:00:00.000Z",
				leftAt: "2026-10-21T14:00:00.000Z",
			}),
		).toBe(1);
		expect(
			attendedSessionHours({
				...session,
				joinedAt: "2026-10-21T13:00:00.000Z",
				leftAt: "2026-10-21T18:00:00.000Z",
			}),
		).toBe(2);
		expect(
			attendedSessionHours({
				...session,
				joinedAt: session.startsAt,
				leftAt: null,
			}),
		).toBe(2);
	});
});

describe("session completion", () => {
	const base = {
		startsAt: "2026-10-21T13:00:00.000Z",
		endsAt: "2026-10-21T15:00:00.000Z",
		graceMinutes: 10,
	};

	it("exige entrada e saída dentro da tolerância", () => {
		expect(
			isSessionCompleted({
				...base,
				joinedAt: "2026-10-21T12:58:00.000Z",
				leftAt: "2026-10-21T14:55:00.000Z",
			}),
		).toBe(true);
		expect(
			isSessionCompleted({
				...base,
				joinedAt: "2026-10-21T13:20:00.000Z",
				leftAt: "2026-10-21T14:55:00.000Z",
			}),
		).toBe(false);
		expect(
			isSessionCompleted({
				...base,
				joinedAt: "2026-10-21T12:58:00.000Z",
				leftAt: "2026-10-21T14:30:00.000Z",
			}),
		).toBe(false);
		expect(
			isSessionCompleted({
				...base,
				joinedAt: "2026-10-21T12:58:00.000Z",
				leftAt: null,
			}),
		).toBe(false);
	});
});

describe("stickers", () => {
	it("calcula progresso e conquista", () => {
		const checkin = stickerByKey("checkin")!;
		expect(resolveStickerProgress(checkin, STATS, CONTEXT)).toEqual({
			available: true,
			earned: true,
			current: 1,
			target: 1,
		});

		const explorer = stickerByKey("explorer")!;
		expect(resolveStickerProgress(explorer, STATS, CONTEXT)).toMatchObject({
			earned: true,
			current: 3,
			target: 3,
		});

		const marathon = stickerByKey("marathon")!;
		expect(resolveStickerProgress(marathon, STATS, CONTEXT)).toMatchObject({
			earned: false,
			current: 4,
			target: 8,
		});

		const connector = stickerByKey("connector")!;
		expect(resolveStickerProgress(connector, STATS, CONTEXT)).toMatchObject(
			{
				earned: false,
				current: 0,
				target: 10,
			},
		);
	});

	it("não passa do alvo", () => {
		const marathon = stickerByKey("marathon")!;
		const progress = resolveStickerProgress(
			marathon,
			{ ...STATS, hours: 20 },
			CONTEXT,
		);
		expect(progress).toMatchObject({ earned: true, current: 8, target: 8 });
	});

	it("Frequente e Todo dia dependem de eventos multi-dia", () => {
		const frequent = stickerByKey("frequent")!;
		const everyday = stickerByKey("everyday")!;

		expect(
			isStickerAvailable(frequent, {
				eventDays: 2,
				checkoutEnabled: false,
			}),
		).toBe(false);
		expect(
			isStickerAvailable(everyday, {
				eventDays: 1,
				checkoutEnabled: false,
			}),
		).toBe(false);
		expect(isStickerAvailable(frequent, CONTEXT)).toBe(true);

		expect(
			resolveStickerProgress(
				frequent,
				{ ...STATS, distinctDays: 3 },
				CONTEXT,
			),
		).toMatchObject({ earned: true, current: 3, target: 3 });

		expect(
			resolveStickerProgress(
				everyday,
				{ ...STATS, distinctDays: 3 },
				CONTEXT,
			),
		).toMatchObject({ earned: true, current: 3, target: 3 });
	});

	it("Finisher só existe com checkout ligado", () => {
		const finisher = stickerByKey("finisher")!;
		expect(
			isStickerAvailable(finisher, {
				...CONTEXT,
				checkoutEnabled: false,
			}),
		).toBe(false);
		expect(
			isStickerAvailable(finisher, { ...CONTEXT, checkoutEnabled: true }),
		).toBe(true);
		expect(
			isStickerEarned(
				finisher,
				{ ...STATS, completedSessions: 5 },
				{ ...CONTEXT, checkoutEnabled: true },
			),
		).toBe(true);
	});

	it("Elite usa a posição no ranking", () => {
		const elite = stickerByKey("elite")!;
		expect(isStickerEarned(elite, { ...STATS, rank: 10 }, CONTEXT)).toBe(
			true,
		);
		expect(isStickerEarned(elite, { ...STATS, rank: 11 }, CONTEXT)).toBe(
			false,
		);
		expect(isStickerEarned(elite, { ...STATS, rank: null }, CONTEXT)).toBe(
			false,
		);
	});
});
