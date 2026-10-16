import "dotenv/config";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

import { drizzle_env as env } from "@verific/env/drizzle_env";

// Print only the host and database name, never credentials.
const { host, pathname } = new URL(env.DATABASE_URL);
console.log(`Target database: ${host}${pathname}`);

const connection = neon(env.DATABASE_URL);
const db = drizzle(connection as NeonQueryFunction<boolean, boolean>);

migrate(db, { migrationsFolder: __dirname.concat("/migrations") })
	.then(() => {
		console.log("✅ Migrations applied successfully!");
	})
	.catch((error) => {
		console.error("❌ Migration failed:", error);
		process.exit(1);
	});
