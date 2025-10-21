import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "@verific/zod";

export const drizzle_env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
	},
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
	},
	emptyStringAsUndefined: true,
});
