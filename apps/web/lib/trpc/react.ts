import type { AppRouter } from "@verific/api";
import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>();

export const TRPCProvider = trpc.Provider;
