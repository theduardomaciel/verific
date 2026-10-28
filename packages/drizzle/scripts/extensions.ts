import "dotenv/config";
import { neon } from "@neondatabase/serverless";

import { drizzle_env as env } from "@verific/env/drizzle_env";

/**
 * `drizzle-kit push` não cria extensões, mas os índices de busca aproximada
 * dependem de `pg_trgm`/`unaccent`. Roda antes do push para um banco novo
 * (encadeado no script `db:push`). As migrações já criam as extensões.
 */
async function main() {
	const sql = neon(env.DATABASE_URL);

	await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
	await sql`CREATE EXTENSION IF NOT EXISTS unaccent`;

	console.log("✅ Extensões pg_trgm e unaccent prontas.");
}

main().catch((error) => {
	console.error("❌ Falha ao criar extensões:", error);
	process.exit(1);
});
