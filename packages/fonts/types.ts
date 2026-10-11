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
}

/** Seleção de fonte feita pelo organizador para um papel do tema. */
export interface FontSelection {
	family: string;
	weights: number[];
	/** Itálico incluído na seleção (padrão: false). */
	italic?: boolean;
}

/** Papéis de fonte do tema (nomes mantidos por compatibilidade). */
export type FontRole = "heading" | "body";
export const FONT_ROLES: readonly FontRole[] = ["heading", "body"] as const;
