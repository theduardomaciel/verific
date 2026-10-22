import "dotenv/config";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { parseArgs } from "node:util";

import { drizzle_env as env } from "@verific/env/drizzle_env";

import { profiles, seed, todayInBrasilia, type ProfileName } from ".";
import * as schema from "../schema";

// Seeds target the development database by default. Pass `--prod` (or
// `--production` / `--target=prod`) to run them against the production
// database instead, for example:
//   pnpm db:seed:prod
//   pnpm --filter @verific/drizzle db:seed -- --profile=minimal --prod
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

const usage = `Uso: pnpm db:seed [--profile=minimal|light|default|gamification|stress] [--seed=N] [--ownerId=ID] [--reset] [--notifications] [--prod]`;

async function main() {
	const { values } = parseArgs({
		options: {
			profile: { type: "string", default: "default" },
			seed: { type: "string", default: "1" },
			ownerId: { type: "string" },
			reset: { type: "boolean", default: false },
			notifications: { type: "boolean" },
			prod: { type: "boolean", default: false },
			production: { type: "boolean", default: false },
			target: { type: "string" },
		},
	});

	if (!(values.profile in profiles)) {
		throw new Error(`Perfil desconhecido: ${values.profile}\n${usage}`);
	}
	const seedNumber = Number(values.seed);
	if (!Number.isInteger(seedNumber)) {
		throw new Error(`--seed precisa ser um inteiro\n${usage}`);
	}

	const targetProduction =
		isProduction ||
		values.prod ||
		values.production ||
		values.target?.toLowerCase() === "prod" ||
		values.target?.toLowerCase() === "production";

	const databaseUrl = targetProduction
		? env.PRODUCTION_DATABASE_URL
		: env.DATABASE_URL;

	if (!databaseUrl) {
		console.error(
			"❌ PRODUCTION_DATABASE_URL is not set. Add it to packages/drizzle/.env before seeding production.",
		);
		process.exit(1);
	}

	const target = targetProduction ? "production" : "development";
	const { host, pathname } = new URL(databaseUrl);
	console.log(
		`🌱 Semeando ${host}${pathname} (perfil ${values.profile}, ${target})...`,
	);

	const pool = new Pool({ connectionString: databaseUrl });
	try {
		const result = await seed(drizzle(pool, { schema }), {
			profile: values.profile as ProfileName,
			seed: seedNumber,
			ownerId: values.ownerId,
			reset: values.reset,
			// Linhas fictícias de notificação só por padrão em dev; em prod
			// exigem `--notifications` explícito.
			notifications: values.notifications ?? !targetProduction,
			refDate: todayInBrasilia(),
		});

		console.log(`✅ ${result.users} usuários`);
		for (const event of result.events) {
			console.log(
				`✅ /${event.project.url}: ${event.participants} participantes, ${event.activities} atividades (${event.sessions} sessões), ${event.enrollments} inscrições em atividades, ${event.waitlist} na fila, ${event.attendances} presenças, ${event.notifications} notificações`,
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
