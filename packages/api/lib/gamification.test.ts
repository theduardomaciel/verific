import { describe, expect, it } from "vitest";

import { DEFAULT_TIME_ZONE } from "@verific/drizzle/time";

import {
	buildStickerStats,
	isGamificationOn,
	pointKeys,
	projectConfig,
} from "./gamification";

describe("gamification service helpers", () => {
	it("monta estatísticas de presença e sessões", () => {
		const stats = buildStickerStats({
			checkinDays: ["2026-10-21"],
			connections: 4,
			timeZone: DEFAULT_TIME_ZONE,
			graceMinutes: 10,
			beforeHour: 9,
			attendance: [
				{
					sessionId: "a",
					// 08:00 em São Paulo.
					startsAt: new Date("2026-10-21T11:00:00.000Z"),
					endsAt: new Date("2026-10-21T12:00:00.000Z"),
					joinedAt: new Date("2026-10-21T11:00:00.000Z"),
					leftAt: new Date("2026-10-21T12:00:00.000Z"),
				},
				{
					sessionId: "b",
					// 11:00 em São Paulo, no dia seguinte.
					startsAt: new Date("2026-10-22T14:00:00.000Z"),
					endsAt: new Date("2026-10-22T16:00:00.000Z"),
					joinedAt: new Date("2026-10-22T14:10:00.000Z"),
					leftAt: null,
				},
			],
		});

		expect(stats).toEqual({
			distinctDays: 2,
			sessions: 2,
			hours: 3,
			earlySessions: 1,
			completedSessions: 1,
		});
	});

	it("não conta sessão sem saída como concluída", () => {
		const stats = buildStickerStats({
			checkinDays: [],
			connections: 0,
			timeZone: DEFAULT_TIME_ZONE,
			graceMinutes: 5,
			beforeHour: 9,
			attendance: [
				{
					sessionId: "a",
					startsAt: new Date("2026-10-21T13:00:00.000Z"),
					endsAt: new Date("2026-10-21T14:00:00.000Z"),
					joinedAt: new Date("2026-10-21T13:00:00.000Z"),
					leftAt: null,
				},
			],
		});
		expect(stats.completedSessions).toBe(0);
		expect(stats.distinctDays).toBe(1);
	});

	it("gera chaves idempotentes por ação", () => {
		expect(pointKeys.checkin("p1")).toBe("checkin:p1");
		expect(pointKeys.daily("p1", "2026-10-21")).toBe("daily:p1:2026-10-21");
		expect(pointKeys.session("p1", "s1")).toBe("session:p1:s1");
		expect(pointKeys.completion("p1", "s1")).toBe("completion:p1:s1");
		expect(pointKeys.enrollment("p1", "a1")).toBe("enroll:p1:a1");
		expect(pointKeys.manual("token")).toBe("manual:token");
	});

	it("respeita o toggle do evento", () => {
		expect(isGamificationOn({ gamification: null })).toBe(false);
		expect(projectConfig({ gamification: { enabled: true } }).enabled).toBe(
			true,
		);
	});
});
