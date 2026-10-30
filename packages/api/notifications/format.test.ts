import { describe, expect, it } from "vitest";

import { DEFAULT_TIME_ZONE } from "@verific/drizzle/time";

import {
	formatActivitySessionsText,
	formatDeadlineText,
	formatEventDateText,
	formatLocationText,
} from "./format";

const SP = DEFAULT_TIME_ZONE;

describe("formatEventDateText", () => {
	it("shows a time window for single-day events", () => {
		expect(
			formatEventDateText(
				new Date("2026-04-12T14:00:00Z"),
				new Date("2026-04-12T18:00:00Z"),
				SP,
			),
		).toBe("12 de abril de 2026, 11:00 – 15:00");
	});

	it("shows a date range for multi-day events", () => {
		expect(
			formatEventDateText(
				new Date("2026-04-12T14:00:00Z"),
				new Date("2026-04-14T18:00:00Z"),
				SP,
			),
		).toBe("12 de abril de 2026 – 14 de abril de 2026");
	});

	it("ends on the previous day when the event ends at midnight", () => {
		expect(
			formatEventDateText(
				new Date("2026-10-26T03:00:00Z"),
				new Date("2026-10-31T03:00:00Z"),
				SP,
			),
		).toBe("26 de outubro de 2026 – 30 de outubro de 2026");
	});
});

describe("formatDeadlineText", () => {
	it("shows the deadline in the event time zone", () => {
		expect(formatDeadlineText(new Date("2026-04-11T23:00:00Z"), SP)).toBe(
			"11 de abril de 2026 às 20:00",
		);
	});
});

describe("formatActivitySessionsText", () => {
	it("returns undefined without sessions", () => {
		expect(formatActivitySessionsText([], SP)).toBeUndefined();
	});

	it("shows the window of a single session", () => {
		expect(
			formatActivitySessionsText(
				[
					{
						startsAt: new Date("2026-04-12T14:00:00Z"),
						endsAt: new Date("2026-04-12T16:00:00Z"),
					},
				],
				SP,
			),
		).toBe("12 de abril de 2026, 11:00 – 13:00");
	});

	it("orders sessions and summarizes the extras", () => {
		expect(
			formatActivitySessionsText(
				[
					{
						startsAt: new Date("2026-04-13T14:00:00Z"),
						endsAt: new Date("2026-04-13T16:00:00Z"),
					},
					{
						startsAt: new Date("2026-04-12T14:00:00Z"),
						endsAt: new Date("2026-04-12T16:00:00Z"),
					},
					{
						startsAt: new Date("2026-04-14T14:00:00Z"),
						endsAt: new Date("2026-04-14T16:00:00Z"),
					},
				],
				SP,
			),
		).toBe("12 de abril de 2026, 11:00 – 13:00 e mais 2");
	});
});

describe("formatLocationText", () => {
	it("prefers the activity address", () => {
		expect(formatLocationText("Lab 4", "Campus")).toBe("Lab 4");
	});

	it("falls back to the event address", () => {
		expect(formatLocationText("  ", "Campus")).toBe("Campus");
		expect(formatLocationText(null, " Campus ")).toBe("Campus");
	});

	it("returns undefined when both are missing", () => {
		expect(formatLocationText(null, undefined)).toBeUndefined();
		expect(formatLocationText("", "  ")).toBeUndefined();
	});
});
