import { activitiesRouter } from "./routers/activities";
import { formsRouter } from "./routers/forms";
import { participantOnActivitiesRouter } from "./routers/participantOnActivities";
import { participantsRouter } from "./routers/participants";
import { profilesRouter } from "./routers/profiles";
import { projectsRouter } from "./routers/projects";
import { speakersRouter } from "./routers/speakers";
import { tagsRouter } from "./routers/tags";
import { uploadsRouter } from "./routers/uploads";
// Routers
import { usersRouter } from "./routers/users";
import { waitlistRouter } from "./routers/waitlist";
import { createCallerFactory, mergeRouters } from "./trpc";

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

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
	waitlistRouter,
);

export { createCallerFactory };

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
