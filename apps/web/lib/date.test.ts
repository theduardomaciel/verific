import { describe, expect, it } from "vitest";

import { calculateWorkloadFromTimes } from "@/lib/date";

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
