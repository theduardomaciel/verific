import { TRPCError } from "@trpc/server";

import type { EventTheme } from "@verific/drizzle/theme";
import { getFont } from "@verific/fonts/catalog";
import { fontSelectionSchemaForRole } from "@verific/fonts/validation";

/**
 * Validação estrita das fontes do tema no salvamento (tRPC `updateProject`).
 *
 * O schema do tema (`@verific/drizzle/theme`) preenche padrões na leitura —
 * `subtitle` ausente copia o `heading` — então a checagem contra o catálogo
 * (família existe? pesos oferecidos? escala dentro do limite do papel?)
 * acontece aqui, só na escrita. Também normaliza a `category` a partir do
 * catálogo (o cliente não decide o fallback das páginas públicas).
 *
 * Lança `BAD_REQUEST` com a primeira divergência encontrada.
 */
export function normalizeThemeFonts(theme: EventTheme): EventTheme {
	const fonts = { ...theme.fonts };
	for (const role of ["heading", "subtitle", "body"] as const) {
		const selection = fonts[role];
		const parsed = fontSelectionSchemaForRole(role).safeParse(selection);
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
			scale: parsed.data.scale,
		};
	}
	return { ...theme, fonts };
}
