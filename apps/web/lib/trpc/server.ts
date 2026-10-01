import "server-only";

import { cache } from "react";

import { getSession } from "@/lib/session";
import type { Session } from "@verific/auth";
import { appRouter, createCallerFactory } from "@verific/api";

const createClient = createCallerFactory(appRouter);
type Client = ReturnType<typeof createClient>;

export const serverClient: Client = createClient(async () => ({
	session: await getSession(),
}));

export const publicClient: Client = createClient(async () => ({
	session: null,
}));

export function createClientForUser(userId: string): Client {
	return createClient(async () => ({
		session: {
			user: {
				id: userId,
			},
		} as Session,
	}));
}

/**
 * Per-request memoized wrapper around `getProjects`.
 *
 * `app/account/layout.tsx` and `app/account/page.tsx` both need the same
 * data. Without `cache()` each `await serverClient.getProjects()` issues its
 * own DB round-trip (and its own `getSession()` → `headers()` access).
 * Memoizing collapses layout + page into a single query per request.
 */
export const getCachedAccountProjects = cache(() =>
	serverClient.getProjects(),
);
