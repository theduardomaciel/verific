import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";

// react.ts
import type { AppRouter } from "@verific/api";

export const trpc: CreateTRPCReact<AppRouter, null> = createTRPCReact<
	AppRouter,
	null
>();
