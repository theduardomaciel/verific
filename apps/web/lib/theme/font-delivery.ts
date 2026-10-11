import type { EventTheme, ThemeFontSelection } from "@verific/drizzle/theme";
import { presetOfFamily } from "@verific/drizzle/theme";
import { buildFontStylesheetUrl } from "@verific/fonts";

/**
 * Entrega das fontes do tema nas páginas públicas (único ponto de
 * decisão — Fase 5 troca o CDN pelo self-hosted só aqui, sem tocar os
 * chamadores).
 *
 * - Papéis com preset (as 5 fontes com curadoria) continuam via
 *   `next/font` (auto-hospedadas, zero terceiros): nada extra é emitido.
 * - Papéis com fonte avulsa geram UMA URL `css2` (só famílias/pesos
 *   salvos, `display=swap` — sem layout shift além da troca) + preconnect.
 * - Sem fonte avulsa: `googleFontsUrl` é `null` e nada é carregado.
 *
 * Derivada do tema salvo em renderização estática: compatível com ISR —
 * a página revalidada já sai com os `<link>` corretos.
 */
export interface FontDelivery {
	googleFontsUrl: string | null;
}

export function getFontDelivery(
	theme: Pick<EventTheme, "fonts">,
): FontDelivery {
	const merged = new Map<string, { weights: number[]; italic: boolean }>();
	for (const role of [theme.fonts.heading, theme.fonts.body] as const) {
		const selection: ThemeFontSelection = role;
		if (presetOfFamily(selection.family)) continue;
		const key = selection.family.trim();
		const existing = merged.get(key);
		if (existing) {
			existing.weights.push(...selection.weights);
			existing.italic = existing.italic || selection.italic === true;
		} else {
			merged.set(key, {
				weights: [...selection.weights],
				italic: selection.italic === true,
			});
		}
	}
	if (merged.size === 0) return { googleFontsUrl: null };
	return {
		googleFontsUrl: buildFontStylesheetUrl(
			[...merged.entries()].map(([family, entry]) => ({
				family,
				weights: entry.weights,
				italic: entry.italic,
			})),
		),
	};
}
