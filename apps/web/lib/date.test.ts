import { describe, expect, it } from "vitest";

import { calculateWorkloadFromTimes, isWithinPeriod } from "@/lib/date";

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
