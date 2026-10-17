import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@verific/auth";

const SESSION_COOKIE_NAMES = [
	"better-auth.session_token",
	"__Secure-better-auth.session_token",
];

export async function GET() {
	await auth.api.signOut({
		headers: await headers(),
	});

	const response = NextResponse.redirect(
		new URL("/auth", process.env.BETTER_AUTH_URL),
	);
	for (const name of SESSION_COOKIE_NAMES) {
		response.cookies.delete(name);
	}

	return response;
}
