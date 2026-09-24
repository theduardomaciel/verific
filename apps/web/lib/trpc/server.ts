import "server-only";

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
