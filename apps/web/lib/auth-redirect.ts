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
 * Used by layouts when a protected procedure throws UNAUTHORIZED. The
 * `clear-session` route clears the stale cookies and sends the user to
 * the sign-in page.
 */
export async function redirectToSignIn() {
	redirect("/api/auth/clear-session");
}
