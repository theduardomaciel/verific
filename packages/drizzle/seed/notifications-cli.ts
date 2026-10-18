import "dotenv/config";
import { Pool } from "@neondatabase/serverless";
import { like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

import { drizzle_env as env } from "@verific/env/drizzle_env";

import * as schema from "../schema";
import {
	insertNotificationFixtures,
	loadNotificationFixtureInput,
} from "./notification-fixtures";
import { SEED_URL_PREFIX, todayInBrasilia } from "./utils";

// Adiciona as linhas fictícias de notificação aos eventos já semeados, sem
// reset e sem tocar em qualquer outro dado. Idempotente: rodar de novo só
// reencontra as mesmas chaves. Sempre no banco de desenvolvimento.
async function main() {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		console.error("❌ DATABASE_URL não configurada.");
		process.exit(1);
	}

	const { host, pathname } = new URL(databaseUrl);
	console.log(`🌱 Semeando notificações fictícias em ${host}${pathname}...`);

	const pool = new Pool({ connectionString: databaseUrl });
	try {
		const db = drizzle(pool, { schema });
		const projects = await db
			.select({
				id: schema.project.id,
				url: schema.project.url,
				ownerId: schema.project.ownerId,
			})
			.from(schema.project)
			.where(like(schema.project.url, `${SEED_URL_PREFIX}%`));

		if (projects.length === 0) {
			console.error(
				"❌ Nenhum evento de seed encontrado. Rode `pnpm db:seed` primeiro.",
			);
			process.exit(1);
		}

		const refDate = todayInBrasilia();
		let total = 0;
		for (const project of projects) {
			const input = await loadNotificationFixtureInput(
				db,
				project,
				refDate,
			);
			const inserted = await insertNotificationFixtures(db, input);
			total += inserted;
			console.log(`✅ /${project.url}: ${inserted} linhas novas`);
		}
		console.log(
			`✅ ${total} notificações fictícias criadas (idempotente).`,
		);
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	console.error(
		"❌ Erro ao semear notificações fictícias:",
		error instanceof Error ? error.message : error,
	);
	process.exit(1);
});
