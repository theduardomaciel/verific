import type * as schema from "../schema";
import type {
	PgDatabase,
	PgQueryResultHKT,
	PgTable,
} from "drizzle-orm/pg-core";

// Aceita tanto o client do app (Neon) quanto outros drivers e transações
export type SeedDb = PgDatabase<PgQueryResultHKT, typeof schema>;

// Marcadores que identificam os dados gerados pelo seed (usados no reset)
export const SEED_EMAIL_DOMAIN = "seed.verific.test";
export const SEED_URL_PREFIX = "seed-";

// O Postgres aceita até 65535 parâmetros por comando
const CHUNK_SIZE = 1000;

export async function insertInChunks<T extends PgTable>(
	db: SeedDb,
	table: T,
	rows: T["$inferInsert"][],
) {
	for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
		await db.insert(table).values(rows.slice(i, i + CHUNK_SIZE));
	}
}

export function slugify(text: string, separator = "-") {
	return text
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, separator)
		.replace(new RegExp(`^\\${separator}+|\\${separator}+$`, "g"), "");
}

export function addDays(date: Date, days: number) {
	return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addMinutes(date: Date, minutes: number) {
	return new Date(date.getTime() + minutes * 60 * 1000);
}
