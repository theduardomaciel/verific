import { entireMetricsCollection } from "@capsizecss/metrics/entireMetricsCollection";

import { normalizeFamily } from "../helpers";

import type { FontCatalogEntry } from "../types";

interface CapsizeMetrics {
	familyName?: unknown;
	xHeight?: unknown;
	unitsPerEm?: unknown;
}

/** xHeightRatio (x-height / unitsPerEm) por família normalizada. */
export function loadMetricsRatios(): Map<string, number> {
	const ratios = new Map<string, number>();
	const entries = Object.values(
		entireMetricsCollection as Record<string, CapsizeMetrics>,
	);
	for (const metrics of entries) {
		if (
			typeof metrics.familyName !== "string" ||
			typeof metrics.xHeight !== "number" ||
			typeof metrics.unitsPerEm !== "number" ||
			metrics.unitsPerEm <= 0 ||
			metrics.xHeight <= 0
		) {
			continue;
		}
		const ratio =
			Math.round((metrics.xHeight / metrics.unitsPerEm) * 10000) / 10000;
		// ratio 1 (x-height = em) indica fonte de ícones/símbolos: inútil
		// para normalizar tamanho de texto — trata como sem métricas.
		if (ratio >= 1) continue;
		ratios.set(normalizeFamily(metrics.familyName), ratio);
	}
	return ratios;
}

/**
 * Preenche `xHeightRatio` nas entradas com métricas; devolve as famílias
 * sem cobertura (sem elas, o picker desabilita a escala em vez de adivinhar).
 */
export function addMetricsToCatalog(
	fonts: FontCatalogEntry[],
	ratios: Map<string, number> = loadMetricsRatios(),
): { fonts: FontCatalogEntry[]; missing: string[] } {
	const missing: string[] = [];
	const enriched = fonts.map((entry) => {
		const ratio = ratios.get(normalizeFamily(entry.family));
		if (ratio === undefined) {
			missing.push(entry.family);
			const { xHeightRatio: _dropped, ...rest } = entry;
			return rest;
		}
		return { ...entry, xHeightRatio: ratio };
	});
	return { fonts: enriched, missing };
}

/** Mapa família → ratio, só com entradas que têm métricas (p/ `aspects.json`). */
export function buildAspectMap(
	fonts: FontCatalogEntry[],
): Record<string, number> {
	const map: Record<string, number> = {};
	for (const entry of fonts) {
		if (entry.xHeightRatio !== undefined) {
			map[entry.family] = entry.xHeightRatio;
		}
	}
	return map;
}
