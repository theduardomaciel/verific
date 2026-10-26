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

/** `getProjects` memoizado por requisição: os layouts da conta e do dashboard. */
export const getCachedAccountProjects = cache(() => serverClient.getProjects());
