import { NextRequest } from "next/server";

import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

const markerOf = (response: Response) =>
	response.headers
		.getSetCookie()
		.find((cookie) => cookie.startsWith("verific_has_session="));

describe("proxy e o marcador de sessão", () => {
	it("grava o marcador ao devolver quem já tem sessão a partir do login", () => {
		const response = proxy(
			new NextRequest(
				"https://verific.app/auth?callbackUrl=/evento/schedule",
				{
					headers: {
						cookie: "__Secure-better-auth.session_token=abc",
					},
				},
			),
		);

		expect(response.headers.get("location")).toBe(
			"https://verific.app/evento/schedule",
		);
		expect(markerOf(response)).toMatch(/^verific_has_session=1;/);
	});

	it("renova o marcador de quem tem sessão", () => {
		const response = proxy(
			new NextRequest("https://verific.app/dashboard", {
				headers: {
					cookie: "__Secure-better-auth.session_token=abc; verific_has_session=1",
				},
			}),
		);

		expect(markerOf(response)).toMatch(/max-age=2592000/i);
	});

	it("não grava o marcador sem sessão", () => {
		const response = proxy(new NextRequest("https://verific.app/auth"));

		expect(markerOf(response)).toBeUndefined();
	});
});
