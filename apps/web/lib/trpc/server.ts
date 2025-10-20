import "server-only";

import { auth } from "@verific/auth";
import { appRouter, createCallerFactory } from "@verific/api";

export const serverClient = createCallerFactory(appRouter)(async () => {
	const session = await auth();

	return { session };
});

export const publicClient = createCallerFactory(appRouter)(async () => {
	return { session: null };
});
