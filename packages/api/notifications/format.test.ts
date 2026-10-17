import { describe, expect, it } from "vitest";

import {
	formatActivitySessionsText,
	formatEventDateText,
	formatLocationText,
} from "./format";

describe("formatEventDateText", () => {
	it("shows a time window for single-day events", () => {
		expect(
			formatEventDateText(
				new Date("2026-04-12T14:00:00Z"),
				new Date("2026-04-12T18:00:00Z"),
			),
		).toBe("12 de abril de 2026, 11:00 – 15:00");
	});

	it("shows a date range for multi-day events", () => {
		expect(
			formatEventDateText(
				new Date("2026-04-12T14:00:00Z"),
				new Date("2026-04-14T18:00:00Z"),
			),
		).toBe("12 de abril de 2026 – 14 de abril de 2026");
	});
});

describe("formatActivitySessionsText", () => {
	it("returns undefined without sessions", () => {
		expect(formatActivitySessionsText([])).toBeUndefined();
	});

	it("shows the window of a single session", () => {
		expect(
			formatActivitySessionsText([
				{
					startsAt: new Date("2026-04-12T14:00:00Z"),
					endsAt: new Date("2026-04-12T16:00:00Z"),
				},
			]),
		).toBe("12 de abril de 2026, 11:00 – 13:00");
	});

	it("orders sessions and summarizes the extras", () => {
		expect(
			formatActivitySessionsText([
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
			]),
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
