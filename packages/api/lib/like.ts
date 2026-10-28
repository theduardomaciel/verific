/**
 * Escapa `%`, `_` e `\` para o texto do usuário valer literalmente num
 * `ilike` (o Postgres usa `\` como escape por padrão).
 */
export function escapeLike(text: string) {
	return text.replace(/[\\%_]/g, "\\$&");
}

/** Padrão `ilike` que acha `text` em qualquer posição. */
export function containsPattern(text: string) {
	return `%${escapeLike(text)}%`;
}
