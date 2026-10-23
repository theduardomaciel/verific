import "server-only";
import { cache } from "react";

import { appRouter, createCallerFactory } from "@verific/api";

import { getSession } from "@/lib/session";
// Rede de segurança: qualquer mutation chamada pelo caller de servidor
// (fora do handler HTTP do tRPC) também encontra o revalidator registrado.
import "@/lib/server-cache-invalidation";

const createClient = createCallerFactory(appRouter);
type Client = ReturnType<typeof createClient>;

export const serverClient: Client = createClient(async () => ({
	session: await getSession(),
}));

export const publicClient: Client = createClient(async () => ({
	session: null,
}));

/**
 * Per-request memoized wrapper around `getProjects`.
 *
 * `app/account/layout.tsx` and `app/account/page.tsx` both need the same
 * data. Without `cache()` each `await serverClient.getProjects()` issues its
 * own DB round-trip (and its own `getSession()` → `headers()` access).
 * Memoizing collapses layout + page into a single query per request.
 */
export const getCachedAccountProjects = cache(() => serverClient.getProjects());
