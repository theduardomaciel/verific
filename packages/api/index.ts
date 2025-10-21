import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

// Routers
import { usersRouter } from "./routers/users";
import { activitiesRouter } from "./routers/activities";
import { projectsRouter } from "./routers/projects";
import { participantsRouter } from "./routers/participants";
import { speakersRouter } from "./routers/speakers";
import { participantOnActivitiesRouter } from "./routers/participantOnActivities";

import { createCallerFactory, mergeRouters } from "./trpc";

export const appRouter = mergeRouters(
	activitiesRouter,
	usersRouter,
	projectsRouter,
	participantsRouter,
	speakersRouter,
	participantOnActivitiesRouter,
);

export { createCallerFactory };

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;