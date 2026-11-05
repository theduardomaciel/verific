import { describe, expect, it } from "vitest";

import { DEFAULT_TIME_ZONE } from "@verific/drizzle/time";

import {
	categorizeByDate,
	formatFriendlyDate,
	getSessionsDateString,
	getSessionTimeString,
	getTimeString,
	isDateDifferent,
	isToday,
	isTomorrow,
	isWithinPeriod,
} from "@/lib/date";

const SP = DEFAULT_TIME_ZONE;

describe("isWithinPeriod", () => {
	const start = new Date("2026-10-26T12:00:00.000Z");
	const end = new Date("2026-10-28T12:00:00.000Z");

	it("includes both boundaries", () => {
		expect(isWithinPeriod(start, end, start)).toBe(true);
		expect(isWithinPeriod(start, end, end)).toBe(true);
	});

	it("rejects moments outside the period", () => {
		expect(
			isWithinPeriod(start, end, new Date("2026-10-26T11:59:59.999Z")),
		).toBe(false);
		expect(
			isWithinPeriod(start, end, new Date("2026-10-28T12:00:00.001Z")),
		).toBe(false);
	});

	it("accepts serialized dates", () => {
		expect(
			isWithinPeriod(
				start.toISOString(),
				end.toISOString(),
				new Date("2026-10-27T00:00:00.000Z"),
			),
		).toBe(true);
	});

	it("rejects invalid dates", () => {
		expect(isWithinPeriod("invalid", end, start)).toBe(false);
	});
});

describe("datas em Brasília", () => {
	// 22h30 de 20/10 em Brasília, já 21/10 em UTC
	const evening = new Date("2026-10-21T01:30:00Z");

	it("usa a hora e o dia de Brasília, qualquer que seja o fuso", () => {
		expect(getTimeString(evening, SP, true)).toBe("22h30");
		expect(getTimeString(evening, SP)).toBe("22:30");
		expect(
			isDateDifferent(evening, new Date("2026-10-20T12:00:00Z"), SP),
		).toBe(false);
	});

	it("reconhece hoje e amanhã pelo dia de Brasília", () => {
		const now = new Date("2026-10-20T15:00:00Z");

		expect(isToday(evening, SP, now)).toBe(true);
		expect(isTomorrow(new Date("2026-10-21T20:00:00Z"), SP, now)).toBe(
			true,
		);
		expect(isToday(evening, SP, null)).toBe(false);
	});

	it("agrupa por dia em ordem cronológica", () => {
		const dates = [
			new Date("2026-11-02T13:00:00Z"),
			evening,
			new Date("2026-10-28T13:00:00Z"),
			new Date("2026-10-21T13:00:00Z"),
		];

		expect(
			categorizeByDate(
				dates,
				(d) => d,
				SP,
				new Date("2026-10-20T15:00:00Z"),
			).categories,
		).toEqual(["Hoje", "Amanhã", "28 de outubro", "02 de novembro"]);
		expect(categorizeByDate(dates, (d) => d, SP, null).categories).toEqual([
			"20 de outubro",
			"21 de outubro",
			"28 de outubro",
			"02 de novembro",
		]);
	});
});

describe("sessões em Brasília", () => {
	// 14h às 16h30 de 20/10 em Brasília
	const afternoon = {
		startsAt: new Date("2026-10-20T17:00:00Z"),
		endsAt: new Date("2026-10-20T19:30:00Z"),
	};
	// 21h às 23h de 20/10 em Brasília, já 21/10 em UTC
	const night = {
		startsAt: new Date("2026-10-21T00:00:00Z"),
		endsAt: new Date("2026-10-21T02:00:00Z"),
	};

	it("mostra o dia de Brasília, mesmo quando o UTC já virou", () => {
		expect(getSessionsDateString([night], SP)).toBe("20/10");
		expect(getSessionsDateString([night, afternoon], SP)).toBe("20/10");
		expect(
			getSessionsDateString(
				[
					afternoon,
					{
						startsAt: new Date("2026-10-22T17:00:00Z"),
						endsAt: new Date("2026-10-22T18:00:00Z"),
					},
				],
				SP,
			),
		).toBe("20/10 - 22/10");
		expect(getSessionsDateString([], SP)).toBe("");
	});

	it("mostra o horário de Brasília", () => {
		expect(getSessionTimeString(afternoon, SP)).toBe("14h - 16h30");
		expect(getSessionTimeString(night, SP)).toBe("21h - 23h");
		expect(getSessionTimeString(afternoon, SP, false)).toBe(
			"14:00 - 16:30",
		);
	});
});

describe("formatFriendlyDate", () => {
	const now = new Date("2026-10-20T15:00:00Z");

	it("usa hoje e amanhã pelo dia de Brasília", () => {
		expect(
			formatFriendlyDate(new Date("2026-10-21T01:30:00Z"), SP, {
				now,
				includeHour: true,
			}),
		).toBe("Hoje, 22:30");
		expect(
			formatFriendlyDate(new Date("2026-10-21T13:00:00Z"), SP, { now }),
		).toBe("Amanhã");
	});

	it("formata os outros dias em Brasília", () => {
		const late = new Date("2026-10-29T01:30:00Z");

		expect(formatFriendlyDate(late, SP, { now })).toBe("28/10");
		expect(formatFriendlyDate(late, SP, { now, includeHour: true })).toBe(
			"28/10, às 22:30",
		);
		expect(
			formatFriendlyDate(late, SP, {
				now,
				includeHour: true,
				longMonth: true,
			}),
		).toBe("28 de outubro, às 22:30");
		expect(formatFriendlyDate(late, SP, { now: null })).toBe("28/10");
	});
});
