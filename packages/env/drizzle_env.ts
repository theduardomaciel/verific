import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const drizzle_env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    PROJECT_ID: z.string().min(1),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    PROJECT_ID: process.env.PROJECT_ID,
  },
  emptyStringAsUndefined: true,
});
