import { describe, expect, it } from "vitest";

import {
	addDays,
	calendarDate,
	dayKey,
	dayOfCalendarDate,
	daysBetween,
	DEFAULT_TIME_ZONE,
	eventDays,
	formatDayKey,
	formatHour,
	formatInstant,
	toWallTime,
	zonedInstant,
} from "./time";

const SP = DEFAULT_TIME_ZONE;

describe("fuso do evento", () => {
	it("roda os testes fora de Brasília", () => {
		expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
			"Asia/Tokyo",
		);
	});

	it("lê dia e hora no fuso, não no do processo", () => {
		// 22h30 de 20/10 em Brasília, já 21/10 em UTC
		const evening = new Date("2026-10-21T01:30:00Z");

		expect(dayKey(evening, SP)).toBe("2026-10-20");
		expect(toWallTime(evening, SP)).toEqual({
			day: "2026-10-20",
			time: "22:30",
		});
		expect(dayKey("inválida", SP)).toBe("");
	});

	it("converte dia e hora de relógio em instante", () => {
		expect(zonedInstant("2026-10-20", "22:30", SP).toISOString()).toBe(
			"2026-10-21T01:30:00.000Z",
		);
		expect(zonedInstant("2026-10-20", "00:00", SP).toISOString()).toBe(
			"2026-10-20T03:00:00.000Z",
		);
	});

	it("ida e volta preservam dia e hora a qualquer hora do dia", () => {
		for (const time of ["00:00", "09:15", "20:59", "21:00", "23:59"]) {
			const instant = zonedInstant("2026-10-30", time, SP);
			expect(toWallTime(instant, SP)).toEqual({
				day: "2026-10-30",
				time,
			});
		}
	});

	it("respeita o horário de verão de outros fusos", () => {
		// Nova York sai do horário de verão em 01/11/2026
		const ny = "America/New_York";
		expect(zonedInstant("2026-10-31", "12:00", ny).toISOString()).toBe(
			"2026-10-31T16:00:00.000Z",
		);
		expect(zonedInstant("2026-11-02", "12:00", ny).toISOString()).toBe(
			"2026-11-02T17:00:00.000Z",
		);
	});
});

describe("dias", () => {
	it("soma dias atravessando meses e anos", () => {
		expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
		expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
	});

	it("lista dias inclusivos", () => {
		expect(daysBetween("2026-10-30", "2026-11-02")).toEqual([
			"2026-10-30",
			"2026-10-31",
			"2026-11-01",
			"2026-11-02",
		]);
		expect(daysBetween("2026-10-30", "2026-10-29")).toEqual([]);
	});

	it("não conta o dia de um fim às 00:00", () => {
		const monday = "2026-10-26T03:00:00Z";
		const days = (endDate: string) =>
			eventDays({ startDate: monday, endDate });

		// Segunda a sábado 00:00, como a secomp26 foi salva
		expect(days("2026-10-31T03:00:00Z")).toEqual(
			daysBetween("2026-10-26", "2026-10-30"),
		);
		// Sexta às 18:00 e às 23:59
		expect(days("2026-10-30T21:00:00Z")).toHaveLength(5);
		expect(days("2026-10-31T02:59:00Z")).toHaveLength(5);
		// Início igual ao fim
		expect(days(monday)).toEqual(["2026-10-26"]);
	});

	it("troca dias com os calendários pela meia-noite local", () => {
		const date = calendarDate("2026-10-30");

		expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
			2026, 9, 30,
		]);
		expect(dayOfCalendarDate(date)).toBe("2026-10-30");
	});
});

describe("formatação", () => {
	it("formata instantes no fuso e dias sem fuso", () => {
		const evening = new Date("2026-10-21T01:30:00Z");

		expect(
			formatInstant(evening, SP, { day: "2-digit", month: "2-digit" }),
		).toBe("20/10");
		expect(formatHour(evening, SP)).toBe("22h30");
		expect(formatHour("2026-10-20T17:00:00Z", SP)).toBe("14h");
		expect(
			formatDayKey("2026-10-30", { day: "numeric", month: "long" }),
		).toBe("30 de outubro");
	});
});
