import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

// Routers
/* import { acesRouter } from "./routers/aces"; */
import { usersRouter } from "./routers/users";
/* import { periodsRouter } from "./routers/periods";
import { membersRouter } from "./routers/members"; */
import { activitiesRouter } from "./routers/activities";
import { projectsRouter } from "./routers/projects";

import { createCallerFactory, mergeRouters } from "./trpc";

/* acesRouter,
	periodsRouter,
	membersRouter, */

export const appRouter = mergeRouters(
	activitiesRouter,
	usersRouter,
	projectsRouter,
);

export { createCallerFactory };

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
