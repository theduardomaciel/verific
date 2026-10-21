/**
 * Normaliza a lista de atividades da query pública de disponibilidade.
 *
 * A query é GET e o CDN cacheia por URL exata: a mesma seleção de atividades
 * precisa gerar o mesmo `activityIds` (sem duplicatas, sempre na mesma ordem),
 * independentemente da ordem de renderização do schedule/detalhe.
 */
export function normalizeActivityIds(activityIds: readonly string[]): string[] {
	return [...new Set(activityIds)].sort();
}
