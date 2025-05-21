import { drizzle_env as env } from "@verific/env/drizzle_env";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./migrations",
	schema: "./schema/index.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
