/**
 * Tipos do catálogo de fontes (Google Fonts) compartilhados entre servidor
 * e editor.
 *
 * Este módulo é propositalmente livre de dados: importar `@verific/fonts`
 * (raiz) nunca puxa o `catalog.json`. O catálogo completo vive em
 * `@verific/fonts/catalog` e só deve ser importado no servidor (validação)
 * ou no editor (picker, com `import()` preguiçoso). Páginas públicas de
 * eventos não podem importar o catálogo.
 */

/** Categoria da fonte segundo a API Google Fonts (subconjunto usado). */
export type FontCategory =
	| "sans-serif"
	| "serif"
	| "display"
	| "handwriting"
	| "monospace";

export const FONT_CATEGORIES: readonly FontCategory[] = [
	"sans-serif",
	"serif",
	"display",
	"handwriting",
	"monospace",
] as const;

export type FontStyle = "normal" | "italic";

/** Uma entrada do catálogo estático de fontes. */
export interface FontCatalogEntry {
	/** Nome exato da família no Google Fonts (ex.: "Hanken Grotesk"). */
	family: string;
	category: FontCategory;
	/** Pesos disponíveis (100–900). */
	weights: number[];
	styles: FontStyle[];
	/** Subconjuntos unicode (ex.: "latin", "latin-ext", "vietnamese"). */
	subsets: string[];
	/** Posição por popularidade (1 = mais popular). */
	popularity: number;
	/** Licença de uso (ex.: "OFL" — permite self-hosting). */
	license: string;
	/**
	 * x-height / unitsPerEm (via @capsizecss/metrics, no script de geração).
	 * Ausente em poucas famílias — sem ele, o controle de escala do picker
	 * fica desabilitado em vez de adivinhar.
	 */
	xHeightRatio?: number;
}

/** Seleção de fonte feita pelo organizador para um papel do tema. */
export interface FontSelection {
	family: string;
	weights: number[];
	/** Itálico incluído na seleção (padrão: false). */
	italic?: boolean;
	/** Multiplicador de tamanho (1 = natural); limites por papel. */
	scale?: number;
}

/** Papéis de fonte do tema. */
export type FontRole = "heading" | "subtitle" | "body";
export const FONT_ROLES: readonly FontRole[] = [
	"heading",
	"subtitle",
	"body",
] as const;

/** Limites do multiplicador de escala por papel (passo 0.05 no picker). */
export const SCALE_LIMITS: Record<
	FontRole,
	{ min: number; max: number; step: number }
> = {
	heading: { min: 0.5, max: 1.5, step: 0.05 },
	subtitle: { min: 0.5, max: 1.5, step: 0.05 },
	body: { min: 0.75, max: 1.25, step: 0.05 },
};
