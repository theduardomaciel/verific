import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

// Routers
import { usersRouter } from "./routers/users";
import { activitiesRouter } from "./routers/activities";
import { projectsRouter } from "./routers/projects";
import { participantsRouter } from "./routers/participants";
import { speakersRouter } from "./routers/speakers";
import { participantOnActivitiesRouter } from "./routers/participantOnActivities";
import { formsRouter } from "./routers/forms";
import { tagsRouter } from "./routers/tags";
import { uploadsRouter } from "./routers/uploads";
import { profilesRouter } from "./routers/profiles";

import { createCallerFactory, mergeRouters } from "./trpc";

export const appRouter = mergeRouters(
	activitiesRouter,
	usersRouter,
	projectsRouter,
	participantsRouter,
	speakersRouter,
	participantOnActivitiesRouter,
	formsRouter,
	tagsRouter,
	uploadsRouter,
	profilesRouter,
);

export { createCallerFactory };

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
