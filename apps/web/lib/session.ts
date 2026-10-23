import { headers } from "next/headers";
import { cache } from "react";

import { isAPIError } from "better-auth/api";

import { auth } from "@verific/auth";

/**
 * Sessão para a renderização no servidor. Não renova: o render não grava
 * cookie, e renovar só no banco deixaria o cookie vencer antes da sessão.
 * Quem renova são os route handlers (`/api/auth/*` e `/api/trpc`).
 */
export const getSession = cache(async () => {
	return auth.api.getSession({
		headers: await headers(),
		query: { disableRefresh: true },
	});
});

/** Sessão num route handler, que pode renovar e gravar o cookie. */
export const getRefreshingSession = cache(async () => {
	try {
		return await auth.api.getSession({
			headers: await headers(),
		});
	} catch (error) {
		// A renovação lança UNAUTHORIZED se a sessão sumiu no meio dela
		if (isAPIError(error) && error.status === "UNAUTHORIZED") return null;
		throw error;
	}
});
