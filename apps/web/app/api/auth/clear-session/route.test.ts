import { NextRequest } from "next/server";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock, signOutMock, cookieSetMock } = vi.hoisted(() => ({
	getSessionMock: vi.fn(),
	signOutMock: vi.fn(),
	cookieSetMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
	headers: async () => new Headers(),
	cookies: async () => ({ set: cookieSetMock }),
}));
vi.mock("@verific/auth", () => ({
	auth: { api: { getSession: getSessionMock, signOut: signOutMock } },
}));

import { SESSION_MARKER_COOKIE } from "@/lib/session-marker";

import { GET } from "./route";

const request = () =>
	new NextRequest("http://localhost:3000/api/auth/clear-session");

describe("/api/auth/clear-session", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("com sessão válida, volta para a conta sem deslogar", async () => {
		getSessionMock.mockResolvedValue({ session: {}, user: {} });

		const res = await GET(request());

		expect(res.headers.get("location")).toBe(
			"http://localhost:3000/account",
		);
		expect(getSessionMock).toHaveBeenCalledWith(
			expect.objectContaining({
				query: { disableCookieCache: true, disableRefresh: true },
			}),
		);
		expect(signOutMock).not.toHaveBeenCalled();
		expect(cookieSetMock).not.toHaveBeenCalled();
	});

	it("sem sessão, apaga os cookies do better-auth e o marcador", async () => {
		getSessionMock.mockResolvedValue(null);
		const signOutHeaders = new Headers();
		for (const name of [
			"__Secure-better-auth.session_token",
			"__Secure-better-auth.session_data",
		]) {
			signOutHeaders.append("set-cookie", `${name}=; Max-Age=0; Path=/`);
		}
		signOutMock.mockResolvedValue({ headers: signOutHeaders });

		const res = await GET(request());

		expect(res.headers.get("location")).toBe("http://localhost:3000/auth");
		const expired = { path: "/", expires: new Date(0) };
		expect(cookieSetMock).toHaveBeenCalledWith(
			"__Secure-better-auth.session_token",
			"",
			{ ...expired, secure: true },
		);
		expect(cookieSetMock).toHaveBeenCalledWith(
			"__Secure-better-auth.session_data",
			"",
			{ ...expired, secure: true },
		);
		// Variante sem prefixo, que o proxy também aceitaria
		expect(cookieSetMock).toHaveBeenCalledWith(
			"better-auth.session_token",
			"",
			{ ...expired, secure: false },
		);
		expect(cookieSetMock).toHaveBeenCalledWith(SESSION_MARKER_COOKIE, "", {
			...expired,
			secure: false,
		});
	});
});
