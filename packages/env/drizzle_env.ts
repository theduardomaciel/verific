import { createEnv } from "@t3-oss/env-nextjs";

import { z } from "@verific/zod";

export const drizzle_env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		// Optional so importing env never fails when only the development
		// database is configured. Migrations read it only when explicitly
		// targeting production (see packages/drizzle/migrate.ts).
		PRODUCTION_DATABASE_URL: z.string().min(1).optional(),
	},
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		PRODUCTION_DATABASE_URL: process.env.PRODUCTION_DATABASE_URL,
	},
	emptyStringAsUndefined: true,
});
