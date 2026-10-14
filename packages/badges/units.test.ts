import { describe, expect, it } from "vitest";

import {
	effectiveDpi,
	fromMm,
	isLowResolution,
	mmToPt,
	ptToMm,
	toMm,
} from "./units";

describe("units", () => {
	it("converts mm to pt and back (90mm badge)", () => {
		expect(mmToPt(90)).toBeCloseTo(255.118, 2);
		expect(ptToMm(mmToPt(55))).toBeCloseTo(55, 9);
	});

	it("converts between in/pt/px and mm", () => {
		expect(toMm(1, "in")).toBeCloseTo(25.4, 9);
		expect(toMm(72, "pt")).toBeCloseTo(25.4, 9);
		expect(toMm(96, "px")).toBeCloseTo(25.4, 9);
		expect(fromMm(25.4, "in")).toBeCloseTo(1, 9);
		expect(fromMm(25.4, "pt")).toBeCloseTo(72, 9);
	});

	it("flags low-resolution artwork below ~300dpi", () => {
		// 1000px across 90mm ≈ 282dpi → warn.
		expect(effectiveDpi(1000, 90)).toBeLessThan(300);
		expect(isLowResolution(1000, 90)).toBe(true);
		// 3000px across 90mm ≈ 847dpi → ok.
		expect(isLowResolution(3000, 90)).toBe(false);
	});
});
