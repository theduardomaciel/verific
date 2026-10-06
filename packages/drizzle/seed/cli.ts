import "dotenv/config";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { parseArgs } from "node:util";

import { drizzle_env as env } from "@verific/env/drizzle_env";

import { profiles, seed, todayInBrasilia, type ProfileName } from ".";
import * as schema from "../schema";

const usage = `Uso: pnpm db:seed [--profile=light|default|stress] [--seed=N] [--ownerId=ID] [--reset]`;

async function main() {
	const { values } = parseArgs({
		options: {
			profile: { type: "string", default: "default" },
			seed: { type: "string", default: "1" },
			ownerId: { type: "string" },
			reset: { type: "boolean", default: false },
		},
	});

	if (!(values.profile in profiles)) {
		throw new Error(`Perfil desconhecido: ${values.profile}\n${usage}`);
	}
	const seedNumber = Number(values.seed);
	if (!Number.isInteger(seedNumber)) {
		throw new Error(`--seed precisa ser um inteiro\n${usage}`);
	}

	const { host, pathname } = new URL(env.DATABASE_URL);
	console.log(`🌱 Semeando ${host}${pathname} (perfil ${values.profile})...`);

	const pool = new Pool({ connectionString: env.DATABASE_URL });
	try {
		const result = await seed(drizzle(pool, { schema }), {
			profile: values.profile as ProfileName,
			seed: seedNumber,
			ownerId: values.ownerId,
			reset: values.reset,
			refDate: todayInBrasilia(),
		});

		console.log(`✅ ${result.users} usuários`);
		for (const event of result.events) {
			console.log(
				`✅ /${event.project.url}: ${event.participants} participantes, ${event.activities} atividades (${event.sessions} sessões), ${event.enrollments} inscrições em atividades, ${event.attendances} presenças`,
			);
		}
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	console.error(
		"❌ Erro ao semear o banco de dados:",
		error instanceof Error ? error.message : error,
	);
	process.exit(1);
});
