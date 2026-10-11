import { TRPCError } from "@trpc/server";

import type { EventTheme } from "@verific/drizzle/theme";
import { getFont } from "@verific/fonts/catalog";
import { fontSelectionSchema } from "@verific/fonts/validation";

/**
 * Validação estrita das fontes do tema no salvamento (tRPC `updateProject`).
 *
 * O schema do tema (`@verific/drizzle/theme`) é tolerante na leitura —
 * migra presets legados e preenche padrões — então a checagem contra o
 * catálogo (família existe? pesos oferecidos?) acontece aqui, só na escrita.
 * Também normaliza a `category` a partir do catálogo (o cliente não decide
 * o fallback das páginas públicas).
 *
 * Lança `BAD_REQUEST` com a primeira divergência encontrada.
 */
export function normalizeThemeFonts(theme: EventTheme): EventTheme {
	const fonts = { ...theme.fonts };
	for (const role of ["heading", "body"] as const) {
		const selection = fonts[role];
		const parsed = fontSelectionSchema.safeParse(selection);
		if (!parsed.success) {
			const message =
				parsed.error.issues[0]?.message ?? "Fonte inválida.";
			throw new TRPCError({ code: "BAD_REQUEST", message });
		}
		const entry = getFont(parsed.data.family);
		if (!entry) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Fonte desconhecida: "${selection.family}"`,
			});
		}
		fonts[role] = {
			family: entry.family,
			weights: [...parsed.data.weights].sort((a, b) => a - b),
			...(parsed.data.italic !== undefined
				? { italic: parsed.data.italic }
				: {}),
			category: entry.category,
		};
	}
	return { ...theme, fonts };
}
