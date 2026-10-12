import { describe, expect, it } from "vitest";

import { getAspect } from "./aspects";
import { catalogSize, getCatalog, getFont, hasFont } from "./catalog";
import { buildSizeAdjust } from "./helpers";
import { fontSelectionSchema, fontSelectionSchemaForRole } from "./validation";

/** Famílias do top 500 sem métricas de x-height (escala desabilitada). */
const KNOWN_WITHOUT_METRICS = [
	"Material Icons",
	"Neuton",
	"Material Symbols Rounded",
	"Material Symbols Outlined",
	"Material Icons Round",
	"Coiny",
	"Material Icons Sharp",
	"Hanalei Fill",
	"Material Icons Outlined",
	"Material Symbols Sharp",
	"M PLUS Rounded 1c",
	"Oxygen",
	"Material Icons Two Tone",
	"M PLUS 1p",
	"Skranji",
	"Isometra",
	"News Cycle",
	"Glegoo",
	"Noto Naskh Arabic",
	"Yellowtail",
	"Cantarell",
];

describe("catalog", () => {
	it("expõe entradas ordenadas por popularidade, sem duplicadas", () => {
		const catalog = getCatalog();
		expect(catalogSize()).toBe(catalog.length);
		expect(catalog.length).toBeGreaterThan(0);
		const families = catalog.map((entry) => entry.family);
		expect(new Set(families).size).toBe(families.length);
		const ranks = catalog.map((entry) => entry.popularity);
		expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
	});

	it("cobre os presets atuais do tema", () => {
		for (const family of [
			"Hanken Grotesk",
			"REM",
			"Inter",
			"Sora",
			"Space Grotesk",
		] as const) {
			expect(hasFont(family)).toBe(true);
		}
	});

	it("busca insensível a caixa/hífen", () => {
		expect(getFont("hanken-grotesk")?.family).toBe("Hanken Grotesk");
		expect(getFont("  inter ")?.family).toBe("Inter");
		expect(getFont("Fonte Inexistente")).toBeUndefined();
	});

	it("tem pesos/subsets válidos e licença aberta", () => {
		for (const entry of getCatalog()) {
			expect(entry.weights.length).toBeGreaterThan(0);
			for (const weight of entry.weights) {
				expect(weight % 100).toBe(0);
			}
			// Exceção documentada: fonte de emoji, sem subconjunto latino.
			if (entry.family !== "Noto Color Emoji") {
				expect(entry.subsets).toContain("latin");
			}
			expect(entry.license).toMatch(/OFL|Apache/i);
		}
	});

	it("tem xHeightRatio válido ou está na lista sem métricas", () => {
		const withoutMetrics: string[] = [];
		for (const entry of getCatalog()) {
			if (entry.xHeightRatio === undefined) {
				withoutMetrics.push(entry.family);
				continue;
			}
			expect(entry.xHeightRatio).toBeGreaterThan(0);
			expect(entry.xHeightRatio).toBeLessThan(1);
		}
		expect(withoutMetrics.sort()).toEqual(
			[...KNOWN_WITHOUT_METRICS].sort(),
		);
	});

	it("o mapa de aspects cobre as entradas com métricas", () => {
		for (const entry of getCatalog()) {
			if (entry.xHeightRatio === undefined) {
				expect(getAspect(entry.family)).toBeUndefined();
			} else {
				expect(getAspect(entry.family)).toBe(entry.xHeightRatio);
			}
		}
		expect(getAspect("inter")).toBe(getAspect("Inter"));
		expect(getAspect("Fonte Inexistente")).toBeUndefined();
	});
});

describe("fontSelectionSchema", () => {
	it("aceita seleção válida do catálogo (escala padrão 1)", () => {
		const result = fontSelectionSchema.safeParse({
			family: "Inter",
			weights: [400, 700],
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.scale).toBe(1);
	});

	it("rejeita família desconhecida", () => {
		const result = fontSelectionSchema.safeParse({
			family: "Comic Papyrus",
			weights: [400],
		});
		expect(result.success).toBe(false);
	});

	it("rejeita peso que a fonte não oferece", () => {
		const result = fontSelectionSchema.safeParse({
			family: "Bebas Neue",
			weights: [700],
		});
		expect(result.success).toBe(false);
	});

	it("rejeita itálico em fonte sem itálico", () => {
		const result = fontSelectionSchema.safeParse({
			family: "Bebas Neue",
			weights: [400],
			italic: true,
		});
		expect(result.success).toBe(false);
	});

	it("valida a escala por papel (texto mais restrito)", () => {
		expect(
			fontSelectionSchemaForRole("body").safeParse({
				family: "Inter",
				weights: [400],
				scale: 1.25,
			}).success,
		).toBe(true);
		expect(
			fontSelectionSchemaForRole("body").safeParse({
				family: "Inter",
				weights: [400],
				scale: 1.3,
			}).success,
		).toBe(false);
		expect(
			fontSelectionSchemaForRole("heading").safeParse({
				family: "Inter",
				weights: [400],
				scale: 1.5,
			}).success,
		).toBe(true);
		expect(
			fontSelectionSchemaForRole("subtitle").safeParse({
				family: "Inter",
				weights: [400],
				scale: 0.4,
			}).success,
		).toBe(false);
	});
});

describe("buildSizeAdjust", () => {
	it("emite escala × métrica, ou null sem desvio/métricas", () => {
		expect(buildSizeAdjust(0.5, 1)).toBeNull();
		expect(buildSizeAdjust(undefined, 0.9)).toBeNull();
		expect(buildSizeAdjust(0.52, 0.9)).toBe(0.468);
	});
});
