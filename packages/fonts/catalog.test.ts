import { describe, expect, it } from "vitest";

import { catalogSize, getCatalog, getFont, hasFont } from "./catalog";
import { fontSelectionSchema } from "./validation";

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
			expect(entry.subsets).toContain("latin");
			expect(entry.license).toMatch(/OFL|Apache/i);
		}
	});
});

describe("fontSelectionSchema", () => {
	it("aceita seleção válida do catálogo", () => {
		const result = fontSelectionSchema.safeParse({
			family: "Inter",
			weights: [400, 700],
		});
		expect(result.success).toBe(true);
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
});
