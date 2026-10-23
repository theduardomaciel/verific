import { NextResponse, type NextRequest } from "next/server";

import { getSessionCookie } from "better-auth/cookies";

import { safeRedirectPath } from "@/lib/safe-redirect";

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
		return NextResponse.redirect(new URL(target, request.url));
	}

	return NextResponse.next();
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
