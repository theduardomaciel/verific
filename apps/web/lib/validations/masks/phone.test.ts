import { describe, expect, it } from "vitest";

import { formatPhone } from "@/lib/validations/masks/phone";

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
