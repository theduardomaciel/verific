import data from "./catalog.json";
import { normalizeFamily } from "./helpers";

import type { FontCatalogEntry } from "./types";

/**
 * Catálogo estático de fontes. Importar APENAS no servidor (validação) ou
 * no editor (picker, via `import()` preguiçoso). Nunca em páginas públicas.
 */
const CATALOG: readonly FontCatalogEntry[] = (
	data as { fonts: FontCatalogEntry[] }
).fonts;

const BY_FAMILY = new Map<string, FontCatalogEntry>(
	CATALOG.map((entry) => [normalizeFamily(entry.family), entry]),
);

/** Todas as entradas, ordenadas por popularidade (1 = mais popular). */
export function getCatalog(): readonly FontCatalogEntry[] {
	return CATALOG;
}

/** Busca por nome (insensível a caixa/espaço/hífen); `undefined` se ausente. */
export function getFont(family: string): FontCatalogEntry | undefined {
	return BY_FAMILY.get(normalizeFamily(family));
}

/** O catálogo contém a família? */
export function hasFont(family: string): boolean {
	return BY_FAMILY.has(normalizeFamily(family));
}

/** Número de famílias no catálogo comprometido. */
export function catalogSize(): number {
	return CATALOG.length;
}
