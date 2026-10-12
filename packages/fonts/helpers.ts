import type { FontCatalogEntry, FontCategory, FontSelection } from "./types";

const GOOGLE_FONTS_CSS2_BASE = "https://fonts.googleapis.com/css2";

/** Pilhas de fallback por categoria (usadas antes/depois do webfont). */
export const FALLBACK_STACKS: Record<FontCategory, string> = {
	"sans-serif":
		'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
	serif: 'Georgia, "Times New Roman", Times, serif',
	display: 'system-ui, -apple-system, "Segoe UI", sans-serif',
	handwriting: '"Segoe Script", "Comic Sans MS", "Chalkboard SE", cursive',
	monospace:
		'ui-monospace, "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace',
};

/** Aspas na família quando necessário para um valor `font-family` válido. */
function quoteFamily(family: string): string {
	const trimmed = family.trim();
	return /["',;]/.test(trimmed) ? trimmed : `"${trimmed}"`;
}

/**
 * Monta o valor CSS de `font-family` para a família, com fallback pela
 * categoria. `category` é opcional: quando ausente (ex.: páginas públicas
 * sem catálogo), usa o fallback sans-serif genérico.
 */
export function buildFontStack(
	family: string,
	category?: FontCategory,
): string {
	const fallback = category
		? FALLBACK_STACKS[category]
		: FALLBACK_STACKS["sans-serif"];
	return `${quoteFamily(family)}, ${fallback}`;
}

/** Normaliza o nome para comparação (caixa/espaços/hífens). */
export function normalizeFamily(family: string): string {
	return family.trim().toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ");
}

/** Slug determinístico da família (para chaves de armazenamento, Fase 5). */
export function slugifyFamily(family: string): string {
	const slug = family
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (!slug) throw new Error(`Nome de família inválido: "${family}"`);
	return slug;
}

/** Só nomes seguros chegam à URL (sem controle do usuário na URL final). */
function assertSafeFamily(family: string): string {
	const trimmed = family.trim();
	if (!/^[A-Za-z0-9][A-Za-z0-9 ]{0,63}$/.test(trimmed)) {
		throw new Error(`Nome de família inválido: "${family}"`);
	}
	return trimmed;
}

function assertValidWeights(weights: number[]): number[] {
	const unique = [...new Set(weights)].sort((a, b) => a - b);
	for (const w of unique) {
		if (!Number.isInteger(w) || w < 1 || w > 1000) {
			throw new Error(`Peso inválido: ${String(w)}`);
		}
	}
	if (unique.length === 0) throw new Error("Selecione ao menos um peso");
	return unique;
}

function encodeFamily(family: string): string {
	return assertSafeFamily(family).replace(/ /g, "+");
}

interface StylesheetSelection {
	family: string;
	weights?: number[];
	/** Incluir o eixo itálico (requer suporte da fonte, validado no servidor). */
	italic?: boolean;
}

/**
 * Monta a URL `css2` do Google Fonts apenas com as famílias/pesos
 * selecionados, sempre com `display=swap`.
 */
export function buildFontStylesheetUrl(
	selections: StylesheetSelection[],
): string {
	if (selections.length === 0) throw new Error("Nenhuma fonte selecionada");
	const params = selections.map((s) => {
		const weights = assertValidWeights(s.weights ?? [400]);
		const axis = s.italic ? "ital,wght" : "wght";
		const values = s.italic
			? weights.flatMap((w) => [`0,${w}`, `1,${w}`]).join(";")
			: weights.join(";");
		return `family=${encodeFamily(s.family)}:${axis}@${values}`;
	});
	return `${GOOGLE_FONTS_CSS2_BASE}?${params.join("&")}&display=swap`;
}

/** Conveniência para uma seleção do tema (mantém o itálico da seleção). */
export function buildSelectionStylesheetUrl(
	selections: FontSelection[],
): string {
	return buildFontStylesheetUrl(
		selections.map((s) => ({
			family: s.family,
			weights: s.weights,
			italic: s.italic ?? false,
		})),
	);
}

/**
 * URL `css2` que carrega só os glifos do nome da fonte (parâmetro `text=`),
 * usada para renderizar cada item da lista do picker sem baixar a fonte toda.
 */
export function buildFontPreviewUrl(
	family: string,
	text: string,
	weight = 400,
): string {
	const glyphs = [...new Set(text.replace(/\s+/g, " "))].join("");
	if (!glyphs) throw new Error("Texto de prévia vazio");
	return (
		`${GOOGLE_FONTS_CSS2_BASE}?family=${encodeFamily(family)}` +
		`:wght@${assertValidWeights([weight])[0]}&text=${encodeURIComponent(glyphs)}&display=swap`
	);
}

/** A fonte cobre acentos do português (subconjunto `latin-ext`)? */
export function hasLatinExt(entry: Pick<FontCatalogEntry, "subsets">): boolean {
	return entry.subsets.includes("latin-ext");
}

/**
 * Valor de `font-size-adjust` para a seleção, ou `null` quando nada deve
 * ser emitido: escala 1 renderiza exatamente como hoje, e sem métricas
 * (`xHeightRatio` ausente) não há como converter o multiplicador.
 */
export function buildSizeAdjust(
	xHeightRatio: number | undefined,
	scale: number,
): number | null {
	if (scale === 1) return null;
	if (xHeightRatio === undefined || xHeightRatio <= 0) return null;
	return Math.round(scale * xHeightRatio * 10000) / 10000;
}

/** A fonte tem ao menos `latin` (ou nada latino — p. ex. só `vietnamese`)? */
export function hasLatin(entry: Pick<FontCatalogEntry, "subsets">): boolean {
	return entry.subsets.includes("latin");
}
