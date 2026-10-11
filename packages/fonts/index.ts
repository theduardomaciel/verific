/**
 * Entrada leve do pacote: tipos + helpers puros (sem dados do catálogo).
 * Seguro para páginas públicas de eventos — não aumenta o bundle.
 *
 * O catálogo completo vive em `@verific/fonts/catalog` (servidor + editor)
 * e a validação zod em `@verific/fonts/validation` (servidor).
 */
export type {
	FontCatalogEntry,
	FontCategory,
	FontRole,
	FontSelection,
	FontStyle,
} from "./types";
export { FONT_CATEGORIES, FONT_ROLES } from "./types";
export {
	buildFontPreviewUrl,
	buildFontStack,
	buildFontStylesheetUrl,
	buildSelectionStylesheetUrl,
	FALLBACK_STACKS,
	hasLatin,
	hasLatinExt,
	normalizeFamily,
	slugifyFamily,
} from "./helpers";
