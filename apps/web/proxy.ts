import { NextResponse, type NextRequest } from "next/server";

import { getSessionCookie } from "better-auth/cookies";

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
		const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
		if (
			callbackUrl?.startsWith("/") &&
			!callbackUrl.startsWith("//") &&
			!callbackUrl.startsWith("/auth")
		) {
			return NextResponse.redirect(new URL(callbackUrl, request.url));
		}
		return NextResponse.redirect(new URL("/account", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/dashboard",
		"/dashboard/:path*",
		"/account",
		"/account/:path*",
		"/auth",
	],
};
