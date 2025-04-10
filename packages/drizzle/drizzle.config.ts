import { drizzle_env as env } from "@ichess/env/drizzle_env";
import type { Config } from "drizzle-kit";

console.log(env.DATABASE_URL);

export default {
	schema: "./schema/index.ts",
	out: "./migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
} satisfies Config;
