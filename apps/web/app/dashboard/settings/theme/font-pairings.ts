import type { FontCategory } from "@verific/fonts";

/**
 * Pares sugeridos (atalho do editor). Todas as famílias existem no
 * catálogo, com pesos oferecidos; a categoria resolve o fallback sem
 * consultar o catálogo no salvamento (o servidor normaliza de todo modo).
 */
export interface SuggestedPairing {
	name: string;
	heading: { family: string; weights: number[]; category: FontCategory };
	body: { family: string; weights: number[]; category: FontCategory };
}

export const SUGGESTED_PAIRINGS: readonly SuggestedPairing[] = [
	{
		name: "Padrão verifIC",
		heading: { family: "REM", weights: [600, 700], category: "sans-serif" },
		body: {
			family: "Hanken Grotesk",
			weights: [400, 500],
			category: "sans-serif",
		},
	},
	{
		name: "Editorial",
		heading: {
			family: "Playfair Display",
			weights: [700],
			category: "serif",
		},
		body: { family: "Inter", weights: [400, 500], category: "sans-serif" },
	},
	{
		name: "Moderno",
		heading: {
			family: "Sora",
			weights: [600, 700],
			category: "sans-serif",
		},
		body: { family: "Inter", weights: [400], category: "sans-serif" },
	},
	{
		name: "Geométrico",
		heading: {
			family: "Outfit",
			weights: [600, 700],
			category: "sans-serif",
		},
		body: {
			family: "Manrope",
			weights: [400, 500],
			category: "sans-serif",
		},
	},
	{
		name: "Acolhedor",
		heading: { family: "Lora", weights: [600], category: "serif" },
		body: { family: "Nunito Sans", weights: [400], category: "sans-serif" },
	},
	{
		name: "Impacto",
		heading: {
			family: "Archivo Black",
			weights: [400],
			category: "display",
		},
		body: {
			family: "Work Sans",
			weights: [400, 500],
			category: "sans-serif",
		},
	},
];
