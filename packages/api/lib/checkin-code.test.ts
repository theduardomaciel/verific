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

	it("accepts the participant id from tickets issued before shortIds", () => {
		expect(
			parseCheckInCode("550E8400-e29b-41d4-a716-446655440000"),
		).toEqual({
			kind: "participantId",
			id: "550e8400-e29b-41d4-a716-446655440000",
		});
	});

	it("rejects empty and garbage payloads", () => {
		expect(() => parseCheckInCode("")).toThrow();
		expect(() => parseCheckInCode("   ")).toThrow();
		expect(() => parseCheckInCode("not a qr!!!")).toThrow();
		expect(() => parseCheckInCode("https://example.com/other")).toThrow();
	});
});
