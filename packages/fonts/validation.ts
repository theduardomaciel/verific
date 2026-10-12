import { z } from "@verific/zod";

import { getFont } from "./catalog";
import { SCALE_LIMITS } from "./types";

import type { FontRole } from "./types";

/**
 * Validação server-side de seleções de fonte contra o catálogo.
 * Importar APENAS no servidor (ou no editor para feedback imediato).
 * Páginas públicas nunca importam este módulo.
 */

/** Pesos Google Fonts válidos (múltiplos de 100 entre 100 e 900). */
const VALID_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

const fontSelectionBase = z.object({
	family: z.string().trim().min(1).max(64),
	weights: z.array(z.number().int().min(100).max(900)).min(1).max(9),
	italic: z.boolean().optional(),
});

/** Schema com o clamp de escala do papel (padrão: limites de títulos). */
export function fontSelectionSchemaForRole(role: FontRole = "heading") {
	const limits = SCALE_LIMITS[role];
	return fontSelectionBase
		.extend({
			scale: z.number().min(limits.min).max(limits.max).default(1),
		})
		.superRefine((selection, ctx) => refineAgainstCatalog(selection, ctx));
}

export const fontSelectionSchema = fontSelectionSchemaForRole("heading");

function refineAgainstCatalog(
	selection: { family: string; weights: number[]; italic?: boolean },
	ctx: z.RefinementCtx,
): void {
	const entry = getFont(selection.family);
	if (!entry) {
		ctx.addIssue({
			code: "custom",
			message: `Fonte desconhecida: "${selection.family}"`,
			path: ["family"],
		});
		return;
	}
	for (const weight of selection.weights) {
		if (!VALID_WEIGHTS.includes(weight as (typeof VALID_WEIGHTS)[number])) {
			ctx.addIssue({
				code: "custom",
				message: `Peso inválido: ${weight} (use múltiplos de 100)`,
				path: ["weights"],
			});
		} else if (!entry.weights.includes(weight)) {
			ctx.addIssue({
				code: "custom",
				message: `"${entry.family}" não oferece o peso ${weight}`,
				path: ["weights"],
			});
		}
	}
	if (selection.italic === true && !entry.styles.includes("italic")) {
		ctx.addIssue({
			code: "custom",
			message: `"${entry.family}" não oferece itálico`,
			path: ["italic"],
		});
	}
}

export type FontSelectionInput = z.infer<typeof fontSelectionSchema>;
