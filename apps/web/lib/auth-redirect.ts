import { redirect } from "next/navigation";

import { TRPCError } from "@trpc/server";

/**
 * Returns `true` when the error is a tRPC UNAUTHORIZED — meaning the
 * session cookie exists but the backing session/user is gone from the
 * DB (e.g. after a wipe).
 */
export function isAuthError(error: unknown): boolean {
	return error instanceof TRPCError && error.code === "UNAUTHORIZED";
}

/**
 * Redirects to the sign-in page. Used as a safety net in layouts when
 * a protected procedure throws UNAUTHORIZED. The proxy (middleware)
 * is the primary mechanism for clearing stale session cookies — this
 * is a fallback for any edge cases it might miss.
 */
export async function redirectToSignIn() {
	redirect("/api/auth/clear-session");
}
