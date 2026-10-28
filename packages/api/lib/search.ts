import { type SQL, type SQLWrapper, and, or, sql } from "@verific/drizzle/orm";

/**
 * Busca aproximada com Postgres (`pg_trgm` + `unaccent`).
 *
 * As colunas indexadas precisam usar exatamente a expressão de
 * `normalizedText` (ver `users_name_trgm_idx`/`users_email_trgm_idx`) para o
 * planner aproveitar o índice GIN.
 */

/** Abaixo de 3 caracteres não há trigrama útil: cai para substring. */
const MIN_FUZZY_TERM_LENGTH = 3;

/** Limita a query para uma entrada patológica não explodir em condições. */
const MAX_TERMS = 5;

/** Forma sem acento e minúscula de uma coluna de texto. */
export function normalizedText(value: SQLWrapper): SQL {
	return sql`unaccent('unaccent', lower(${value}))`;
}

function tokenize(query: string | undefined) {
	return (query ?? "")
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, MAX_TERMS);
}

/**
 * Monta um `AND` de termos: cada termo precisa casar com ao menos uma coluna
 * por substring ou por similaridade de trigrama. Retorna `undefined` para
 * query vazia.
 */
export function fuzzySearch(
	columns: readonly SQLWrapper[],
	query: string | undefined,
): SQL | undefined {
	const terms = tokenize(query);
	if (terms.length === 0 || columns.length === 0) return undefined;

	const conditions = terms.map((term) => {
		const needle = normalizedText(sql`${term}::text`);
		const matches = columns.map((column) => {
			const haystack = normalizedText(column);
			const substring = sql`${haystack} ilike '%' || ${needle} || '%'`;
			if (term.length < MIN_FUZZY_TERM_LENGTH) return substring;
			// `<%` é o operador indexável de `word_similarity`.
			return or(substring, sql`${needle} <% ${haystack}`)!;
		});
		return or(...matches)!;
	});

	return and(...conditions);
}

/**
 * Score de relevância para ordenação: soma, por termo, do melhor
 * `word_similarity` entre as colunas. `undefined` para query vazia.
 */
export function fuzzyRank(
	columns: readonly SQLWrapper[],
	query: string | undefined,
): SQL | undefined {
	const terms = tokenize(query);
	if (terms.length === 0 || columns.length === 0) return undefined;

	const perTerm = terms.map((term) => {
		const needle = normalizedText(sql`${term}::text`);
		const scores = columns.map(
			(column) =>
				sql`word_similarity(${needle}, ${normalizedText(column)})`,
		);
		return sql`greatest(${sql.join(scores, sql`, `)})`;
	});

	return sql.join(perTerm, sql` + `);
}
