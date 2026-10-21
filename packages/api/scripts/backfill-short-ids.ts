import { db } from "@verific/drizzle";
import { and, eq, isNull } from "@verific/drizzle/orm";
import { participant } from "@verific/drizzle/schema";

import { generateShortId } from "../lib/short-id";

/**
 * Backfill manual de `participant.short_id` para linhas legadas.
 *
 * Não roda no build/deploy. Execute uma vez, com o banco de produção:
 *   pnpm --filter @verific/api backfill:short-ids
 *
 * O UPDATE é condicional (`short_id IS NULL`) e idempotente: pode ser
 * reexecutado sem sobrescrever ids já existentes.
 */
async function main() {
	const rows = await db.query.participant.findMany({
		where: isNull(participant.shortId),
		columns: { id: true },
	});

	let updated = 0;

	for (const row of rows) {
		for (let attempt = 0; attempt < 5; attempt++) {
			try {
				const changed = await db
					.update(participant)
					.set({ shortId: generateShortId() })
					.where(
						and(
							eq(participant.id, row.id),
							isNull(participant.shortId),
						),
					)
					.returning({ id: participant.id });

				if (changed.length > 0) updated++;
				break;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : String(error);
				if (!/unique|duplicate/i.test(message)) throw error;
			}
		}
	}

	console.log(
		`[backfill-short-ids] ${updated} de ${rows.length} participante(s) sem shortId preenchido(s).`,
	);
}

void main().catch((error) => {
	console.error("[backfill-short-ids] falhou:", error);
	process.exitCode = 1;
});
