import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

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
