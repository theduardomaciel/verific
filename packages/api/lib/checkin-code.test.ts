import { describe, expect, it } from "vitest";

import { parseCheckInCode } from "./checkin-code";

describe("parseCheckInCode", () => {
	it("accepts raw shortIds", () => {
		expect(parseCheckInCode("Ab12Cd34Ef")).toEqual({
			kind: "shortId",
			shortId: "Ab12Cd34Ef",
		});
	});

	it("extracts shortId from badge profile URLs", () => {
		expect(
			parseCheckInCode("https://example.com/my-event/profile/Ab12Cd34Ef"),
		).toEqual({ kind: "shortId", shortId: "Ab12Cd34Ef" });
		expect(parseCheckInCode("/my-event/profile/Ab12Cd34Ef")).toEqual({
			kind: "shortId",
			shortId: "Ab12Cd34Ef",
		});
	});

	it("rejects empty and garbage payloads", () => {
		expect(() => parseCheckInCode("")).toThrow();
		expect(() => parseCheckInCode("   ")).toThrow();
		expect(() => parseCheckInCode("not a qr!!!")).toThrow();
		expect(() => parseCheckInCode("https://example.com/other")).toThrow();
	});
});
