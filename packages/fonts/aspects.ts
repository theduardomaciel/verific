import aspects from "./aspects.json";
import { normalizeFamily } from "./helpers";

const BY_FAMILY = new Map<string, number>(
	Object.entries(aspects as Record<string, number>).map(([family, ratio]) => [
		normalizeFamily(family),
		ratio,
	]),
);

/**
 * x-height / unitsPerEm da família, ou `undefined` (sem métricas — escala
 * indisponível). Mapa enxuto (~2 KB): páginas públicas podem importar sem
 * puxar o catálogo completo.
 */
export function getAspect(family: string): number | undefined {
	return BY_FAMILY.get(normalizeFamily(family));
}
