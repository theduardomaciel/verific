import "dotenv/config";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

import { drizzle_env as env } from "@verific/env/drizzle_env";

// Migrations target the development database by default. Pass `--prod` (or
// `--production` / `--target=prod`) to run them against the production
// database instead, for example:
//   pnpm db:migrate:prod
//   pnpm --filter @verific/drizzle db:migrate -- --prod
const productionFlags = new Set([
	"--prod",
	"--production",
	"--target=prod",
	"--target=production",
	"prod",
	"production",
]);
const isProduction = process.argv
	.slice(2)
	.some((arg) => productionFlags.has(arg.toLowerCase()));

const databaseUrl = isProduction
	? env.PRODUCTION_DATABASE_URL
	: env.DATABASE_URL;

if (!databaseUrl) {
	console.error(
		"❌ PRODUCTION_DATABASE_URL is not set. Add it to packages/drizzle/.env before migrating production.",
	);
	process.exit(1);
}

const target = isProduction ? "production" : "development";
// Print only the host and database name, never credentials.
const { host, pathname } = new URL(databaseUrl);
console.log(`Target database (${target}): ${host}${pathname}`);

const connection = neon(databaseUrl);
const db = drizzle(connection as NeonQueryFunction<boolean, boolean>);

migrate(db, { migrationsFolder: __dirname.concat("/migrations") })
	.then(() => {
		console.log("✅ Migrations applied successfully!");
	})
	.catch((error) => {
		console.error("❌ Migration failed:", error);
		process.exit(1);
	});
