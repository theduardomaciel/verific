import { NextResponse, type NextRequest } from "next/server";

import { getSessionCookie } from "better-auth/cookies";

import { safeRedirectPath } from "@/lib/safe-redirect";
import {
	SESSION_MARKER_COOKIE,
	SESSION_MARKER_MAX_AGE,
} from "@/lib/session-marker";

/**
 * Grava (e renova) o marcador que as páginas públicas leem. Sem ele, quem
 * entrou antes do marcador seria anônimo nelas e o login a mandaria de volta
 * sem fim.
 */
function withSessionMarker(request: NextRequest, response: NextResponse) {
	response.cookies.set(SESSION_MARKER_COOKIE, "1", {
		path: "/",
		maxAge: SESSION_MARKER_MAX_AGE,
		sameSite: "lax",
		secure: request.nextUrl.protocol === "https:",
	});
	return response;
}

export function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
	const sessionCookie = getSessionCookie(request);
	const isProtectedRoute =
		pathname === "/dashboard" ||
		pathname.startsWith("/dashboard/") ||
		pathname === "/account" ||
		pathname.startsWith("/account/");

	if (isProtectedRoute && !sessionCookie) {
		const callbackUrl = `${pathname}${request.nextUrl.search}`;
		const loginUrl = new URL("/auth", request.url);
		loginUrl.searchParams.set("callbackUrl", callbackUrl);
		return NextResponse.redirect(loginUrl);
	}

	if (pathname === "/auth" && sessionCookie) {
		// Usuário já logado voltando ao login (ex.: de `/[event]/subscribe`):
		// respeita o destino original em vez de forçar `/account`.
		const callbackUrl = safeRedirectPath(
			request.nextUrl.searchParams.get("callbackUrl"),
			"/account",
		);
		const target = callbackUrl.startsWith("/auth")
			? "/account"
			: callbackUrl;
		return withSessionMarker(
			request,
			NextResponse.redirect(new URL(target, request.url)),
		);
	}

	return sessionCookie
		? withSessionMarker(request, NextResponse.next())
		: NextResponse.next();
}

// Matcher deliberadamente mínimo: rotas públicas do evento, `/_next/*`,
// assets, robots/sitemap e payloads RSC `.segment` não passam pelo proxy.
// Só estas rotas precisam do cookie de sessão para redirecionar.
export const config = {
	matcher: [
		"/dashboard",
		"/dashboard/:path*",
		"/account",
		"/account/:path*",
		"/auth",
	],
};
