import "dotenv/config";
import { neon } from "@neondatabase/serverless";

import { drizzle_env as env } from "@verific/env/drizzle_env";

/**
 * `drizzle-kit push` não cria extensões nem funções, mas a busca aproximada
 * depende de `pg_trgm`/`unaccent` e do wrapper IMMUTABLE. Roda
 * antes do push para um banco novo (encadeado no script `db:push`). As
 * migrações já criam tudo.
 */
async function main() {
	const sql = neon(env.DATABASE_URL);

	await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
	await sql`CREATE EXTENSION IF NOT EXISTS unaccent`;
	// `unaccent` é STABLE; o wrapper IMMUTABLE é o que a busca usa.
	await sql`
		CREATE OR REPLACE FUNCTION public.immutable_unaccent(value text)
		RETURNS text
		LANGUAGE sql
		IMMUTABLE
		STRICT
		PARALLEL SAFE
		AS $func$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $func$
	`;

	console.log("✅ Extensões e função de busca prontas.");
}

main().catch((error) => {
	console.error("❌ Falha ao criar extensões:", error);
	process.exit(1);
});
