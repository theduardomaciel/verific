import { activitiesRouter } from "./routers/activities";
import { availabilityRouter } from "./routers/availability";
import { badgesRouter } from "./routers/badges";
import { formsRouter } from "./routers/forms";
import { notificationsRouter } from "./routers/notifications";
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
	availabilityRouter,
	badgesRouter,
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
	notificationsRouter,
);

export { createCallerFactory };

// Cache pública (Next `cacheComponents`): vocabulário de tags + ponte de
// revalidação usada pelo handler HTTP do app (o import de `next/cache` fica
// fora deste pacote de propósito — ver `cache-invalidation.ts`).
export {
	invalidateAuthUserChange,
	registerCacheRevalidator,
} from "./cache-invalidation";

export * from "./cache-tags";

export * from "./notifications";
export * from "./scheduler";

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
