import { describe, expect, it } from "vitest";

import {
	assertPublicProfilePayload,
	buildProfilePath,
	buildProfileUrl,
} from "./qr-payload";

describe("qr-payload", () => {
	it("encodes only the canonical public profile link", () => {
		expect(buildProfilePath("my-event", "Ab12Cd34Ef")).toBe(
			"/my-event/profile/Ab12Cd34Ef",
		);
		expect(
			buildProfileUrl("https://example.com/", "my-event", "Ab12Cd34Ef"),
		).toBe("https://example.com/my-event/profile/Ab12Cd34Ef");
	});

	it("rejects sensitive identifiers", () => {
		expect(() =>
			buildProfilePath(
				"my-event",
				"123e4567-e89b-12d3-a456-426614174000",
			),
		).toThrow();
		expect(() => buildProfilePath("my-event", "a@b.com")).toThrow();
		expect(() => buildProfilePath("", "Ab12Cd34Ef")).toThrow();
	});

	it("asserts payloads are public links without PII", () => {
		expect(() =>
			assertPublicProfilePayload(
				"https://example.com/ev/profile/Ab12Cd34Ef",
			),
		).not.toThrow();
		expect(() =>
			assertPublicProfilePayload("123e4567-e89b-12d3-a456-426614174000"),
		).toThrow();
		expect(() => assertPublicProfilePayload("user@example.com")).toThrow();
		expect(() =>
			assertPublicProfilePayload("https://example.com/ev"),
		).toThrow();
	});
});
