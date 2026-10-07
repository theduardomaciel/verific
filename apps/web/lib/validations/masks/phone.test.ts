import { describe, expect, it } from "vitest";

import {
	formatPhone,
	toE164BR,
	toNationalBR,
} from "@/lib/validations/masks/phone";

describe("formatPhone", () => {
	it("returns an empty string for empty input", () => {
		expect(formatPhone("")).toBe("");
	});

	it("formats partial numbers progressively", () => {
		expect(formatPhone("8")).toBe("(8");
		expect(formatPhone("829")).toBe("(82) 9");
	});

	it("formats a full mobile number", () => {
		expect(formatPhone("82999991234")).toBe("(82) 99999-1234");
	});

	it("strips non-digit characters and caps at 11 digits", () => {
		expect(formatPhone("(82) 99999-1234")).toBe("(82) 99999-1234");
		expect(formatPhone("82999991234999")).toBe("(82) 99999-1234");
	});
});

describe("toE164BR / toNationalBR", () => {
	it("returns an empty string for empty input", () => {
		expect(toE164BR("")).toBe("");
		expect(toNationalBR("")).toBe("");
	});

	it("normalizes national input to E.164", () => {
		expect(toE164BR("(82) 99999-1234")).toBe("+5582999991234");
		expect(toE164BR("82999991234")).toBe("+5582999991234");
	});

	it("keeps E.164 input as-is", () => {
		expect(toE164BR("+5582999991234")).toBe("+5582999991234");
	});

	it("strips the 55 country code for display", () => {
		expect(toNationalBR("+5582999991234")).toBe("82999991234");
		expect(toNationalBR("")).toBe("");
	});

	it("round-trips display -> store -> display", () => {
		const stored = toE164BR("(82) 99999-1234");
		expect(formatPhone(toNationalBR(stored))).toBe("(82) 99999-1234");
	});
});
