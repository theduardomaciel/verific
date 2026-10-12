import type { FontPreset, ThemeFontSelection } from "@verific/drizzle/theme";
import { presetOfFamily } from "@verific/drizzle/theme";
import { buildFontStack } from "@verific/fonts";

/** Presets de fonte (dados puros, sem next/font — seguro para testes). */
export const FONT_FAMILIES: Record<FontPreset, string> = {
	"hanken-grotesk": "Hanken Grotesk, sans-serif",
	rem: "REM, sans-serif",
	inter: "Inter, sans-serif",
	sora: "Sora, sans-serif",
	"space-grotesk": "Space Grotesk, sans-serif",
};

/**
 * Valor de `font-family` para uma seleção do tema: presets mantêm a
 * cadeia com curadoria; fontes avulsas usam a pilha pela categoria
 * (guardada no tema — páginas públicas não consultam o catálogo).
 */
export function resolveThemeFontFamily(selection: ThemeFontSelection): string {
	const preset = presetOfFamily(selection.family);
	if (preset) return FONT_FAMILIES[preset]!;
	return buildFontStack(selection.family, selection.category ?? "sans-serif");
}
