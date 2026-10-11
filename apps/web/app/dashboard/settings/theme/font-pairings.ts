/**
 * Pares sugeridos (atalho do picker — Fase 4 mostra no editor).
 * Todas as famílias existem no catálogo, com pesos oferecidos.
 */
export interface SuggestedPairing {
	name: string;
	heading: { family: string; weights: number[] };
	body: { family: string; weights: number[] };
}

export const SUGGESTED_PAIRINGS: readonly SuggestedPairing[] = [
	{
		name: "Padrão verifIC",
		heading: { family: "REM", weights: [600, 700] },
		body: { family: "Hanken Grotesk", weights: [400, 500] },
	},
	{
		name: "Editorial",
		heading: { family: "Playfair Display", weights: [700] },
		body: { family: "Inter", weights: [400, 500] },
	},
	{
		name: "Moderno",
		heading: { family: "Sora", weights: [600, 700] },
		body: { family: "Inter", weights: [400] },
	},
	{
		name: "Geométrico",
		heading: { family: "Outfit", weights: [600, 700] },
		body: { family: "Manrope", weights: [400, 500] },
	},
	{
		name: "Acolhedor",
		heading: { family: "Lora", weights: [600] },
		body: { family: "Nunito Sans", weights: [400] },
	},
	{
		name: "Impacto",
		heading: { family: "Archivo Black", weights: [400] },
		body: { family: "Work Sans", weights: [400, 500] },
	},
];
