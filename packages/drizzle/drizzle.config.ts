import { defineConfig } from "drizzle-kit";

import { drizzle_env as env } from "@verific/env/drizzle_env";

export default defineConfig({
	out: "./migrations",
	schema: "./schema/index.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
