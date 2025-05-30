import "dotenv/config";
import { drizzle_env as env } from "@verific/env/drizzle_env";

console.log("DATABASE_URL:");
console.log(env.DATABASE_URL);

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const connection = neon(env.DATABASE_URL);
const db = drizzle(connection as NeonQueryFunction<boolean, boolean>);

migrate(db, { migrationsFolder: __dirname.concat("/migrations") }).then(() => {
	console.log("✅ Migrations applied successfully!");
});
