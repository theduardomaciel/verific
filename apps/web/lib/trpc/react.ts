// react.ts
import type { AppRouter } from "@verific/api";
import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";

export const trpc: CreateTRPCReact<AppRouter, null> =
    createTRPCReact<AppRouter, null>();