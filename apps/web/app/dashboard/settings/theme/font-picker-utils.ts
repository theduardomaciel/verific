import type { FontCatalogEntry, FontCategory, FontRole } from "@verific/fonts";

export interface FontFilter {
	query: string;
	category: FontCategory | "all";
	subset: string;
	sort: "popularity" | "name";
}

/**
 * Prévia temporária de família (hover/teclado no picker → prévia grande).
 * O editor eleva até o `ThemePreview` sem tocar o rascunho.
 */
export interface FontHoverHint {
	family: string;
	category: FontCategory;
	weight: number;
}

/** Minúsculas sem acento p/ busca pt-BR ("otica" acha "ótica"). */
export function normalizeSearch(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

/** Filtra + ordena o catálogo (puro — sem DOM). */
export function filterFontCatalog(
	entries: readonly FontCatalogEntry[],
	filter: FontFilter,
): FontCatalogEntry[] {
	const query = normalizeSearch(filter.query.trim());
	const result = entries.filter((entry) => {
		if (filter.category !== "all" && entry.category !== filter.category) {
			return false;
		}
		if (filter.subset !== "all" && !entry.subsets.includes(filter.subset)) {
			return false;
		}
		if (query === "") return true;
		return normalizeSearch(entry.family).includes(query);
	});
	return [...result].sort((a, b) =>
		filter.sort === "name"
			? a.family.localeCompare(b.family)
			: a.popularity - b.popularity,
	);
}

/** Subconjuntos presentes no catálogo (p/ o filtro). */
export function catalogSubsets(entries: readonly FontCatalogEntry[]): string[] {
	const subsets = new Set<string>();
	for (const entry of entries) {
		for (const subset of entry.subsets) subsets.add(subset);
	}
	return [...subsets].sort();
}

export interface PayloadEstimate {
	/** Arquivos woff2 (pesos × estilos × subconjuntos latinos). */
	files: number;
	/** Estimativa grosseira em KB (média de ~18 KB por arquivo latino). */
	kb: number;
}

const AVG_LATIN_WOFF2_KB = 18;

/**
 * Heurística honesta do custo da seleção (nº de arquivos + ordem de
 * grandeza). O valor exato só existe após a ingestão (Fase 5).
 */
export function estimateFontPayload(
	entry: Pick<FontCatalogEntry, "subsets">,
	weights: number[],
	italic: boolean,
	styles: readonly string[] = ["normal"],
): PayloadEstimate {
	const latinSubsets = entry.subsets.filter(
		(subset) => subset === "latin" || subset === "latin-ext",
	).length;
	const styleCount = italic && styles.includes("italic") ? 2 : 1;
	const files =
		Math.max(1, weights.length) * styleCount * Math.max(1, latinSubsets);
	return { files, kb: files * AVG_LATIN_WOFF2_KB };
}

const RECENT_KEY = "verific:recent-fonts";
const MAX_RECENT = 6;

function storage(): Storage | null {
	try {
		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
}

/** Famílias usadas recentemente (persistência só no cliente). */
export function readRecentFonts(): string[] {
	const store = storage();
	if (!store) return [];
	try {
		const raw = store.getItem(RECENT_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((item): item is string => typeof item === "string")
			.slice(0, MAX_RECENT);
	} catch {
		return [];
	}
}

/** Registra uso (frente da lista, sem duplicadas, máx. 6). */
export function pushRecentFont(family: string): string[] {
	const recents = [
		family,
		...readRecentFonts().filter((item) => item !== family),
	].slice(0, MAX_RECENT);
	try {
		storage()?.setItem(RECENT_KEY, JSON.stringify(recents));
	} catch {
		// Armazenamento indisponível (privado/SSR): ignora.
	}
	return recents;
}

/** Padrão de cada papel (ação "restaurar padrão" do picker). */ export function defaultFontForRole(
	role: FontRole,
): {
	family: string;
	weights: number[];
} {
	return role === "heading"
		? { family: "REM", weights: [400, 500, 600, 700] }
		: { family: "Hanken Grotesk", weights: [400, 500, 600, 700] };
}

/** Amostras de prévia (inclui frase com acentos do português). */
export const SAMPLE_PRESETS = [
	{
		id: "heading",
		label: "Título",
		text: "Encontro de Tecnologia 2026",
	},
	{
		id: "paragraph",
		label: "Parágrafo",
		text: "As inscrições estão abertas para todos os minicursos, palestras e maratonas de programação do evento.",
	},
	{
		id: "button",
		label: "Botão",
		text: "Inscrever-se agora",
	},
	{
		id: "accents",
		label: "Acentos",
		text: "Ações rápidas à meia-noite: não fique de fora — ç ã õ â ê ô à!",
	},
] as const;
