import { describe, expect, it } from "vitest";

import {
	calculateWorkloadFromTimes,
	categorizeByDate,
	getTimeString,
	isDateDifferent,
	isToday,
	isTomorrow,
	isWithinPeriod,
	saoPauloDayKey,
} from "@/lib/date";

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

describe("calculateWorkloadFromTimes", () => {
	it("calculates the workload in hours between two times", () => {
		expect(calculateWorkloadFromTimes("08:00", "10:30")).toBe(2.5);
	});

	it("rounds the workload to two decimal places", () => {
		expect(calculateWorkloadFromTimes("08:00", "08:10")).toBe(0.17);
	});

	it("clamps overnight ranges to zero", () => {
		expect(calculateWorkloadFromTimes("18:00", "08:00")).toBe(0);
	});

	it("returns undefined when either time is missing", () => {
		expect(calculateWorkloadFromTimes(undefined, "10:00")).toBeUndefined();
		expect(calculateWorkloadFromTimes("08:00", undefined)).toBeUndefined();
		expect(
			calculateWorkloadFromTimes(undefined, undefined),
		).toBeUndefined();
	});
});

describe("datas em Brasília", () => {
	// 22h30 de 20/10 em Brasília, já 21/10 em UTC
	const evening = new Date("2026-10-21T01:30:00Z");

	it("usa a hora e o dia de Brasília, qualquer que seja o fuso", () => {
		expect(getTimeString(evening, true)).toBe("22h30");
		expect(saoPauloDayKey(evening)).toBe("2026-10-20");
		expect(isDateDifferent(evening, new Date("2026-10-20T12:00:00Z"))).toBe(
			false,
		);
	});

	it("reconhece hoje e amanhã pelo dia de Brasília", () => {
		const now = new Date("2026-10-20T15:00:00Z");

		expect(isToday(evening, now)).toBe(true);
		expect(isTomorrow(new Date("2026-10-21T20:00:00Z"), now)).toBe(true);
		expect(isToday(evening, null)).toBe(false);
	});

	it("agrupa por dia em ordem cronológica", () => {
		const dates = [
			new Date("2026-11-02T13:00:00Z"),
			evening,
			new Date("2026-10-28T13:00:00Z"),
			new Date("2026-10-21T13:00:00Z"),
		];

		expect(
			categorizeByDate(dates, (d) => d, new Date("2026-10-20T15:00:00Z"))
				.categories,
		).toEqual(["Hoje", "Amanhã", "28 de outubro", "02 de novembro"]);
		expect(categorizeByDate(dates, (d) => d, null).categories).toEqual([
			"20 de outubro",
			"21 de outubro",
			"28 de outubro",
			"02 de novembro",
		]);
	});
});
