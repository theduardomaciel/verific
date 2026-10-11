import { describe, expect, it } from "vitest";

import type { FontCatalogEntry } from "@verific/fonts";

import {
	catalogSubsets,
	defaultFontForRole,
	estimateFontPayload,
	filterFontCatalog,
	normalizeSearch,
} from "./font-picker-utils";

const ENTRIES: FontCatalogEntry[] = [
	{
		family: "Inter",
		category: "sans-serif",
		weights: [400, 700],
		styles: ["normal", "italic"],
		subsets: ["latin", "latin-ext"],
		popularity: 2,
		license: "OFL",
	},
	{
		family: "Playfair Display",
		category: "serif",
		weights: [700],
		styles: ["normal"],
		subsets: ["latin", "latin-ext"],
		popularity: 1,
		license: "OFL",
	},
	{
		family: "Bebas Neue",
		category: "display",
		weights: [400],
		styles: ["normal"],
		subsets: ["latin"],
		popularity: 3,
		license: "OFL",
	},
];

describe("normalizeSearch", () => {
	it("ignora acentos e caixa", () => {
		expect(normalizeSearch("Ótica")).toBe("otica");
	});
});

describe("filterFontCatalog", () => {
	it("ordena por popularidade por padrão", () => {
		const result = filterFontCatalog(ENTRIES, {
			query: "",
			category: "all",
			subset: "all",
			sort: "popularity",
		});
		expect(result.map((entry) => entry.family)).toEqual([
			"Playfair Display",
			"Inter",
			"Bebas Neue",
		]);
	});

	it("ordena por nome e busca sem acento", () => {
		const result = filterFontCatalog(ENTRIES, {
			query: "display",
			category: "all",
			subset: "all",
			sort: "name",
		});
		expect(result.map((entry) => entry.family)).toEqual([
			"Playfair Display",
		]);
	});

	it("filtra por categoria e subconjunto", () => {
		expect(
			filterFontCatalog(ENTRIES, {
				query: "",
				category: "serif",
				subset: "all",
				sort: "popularity",
			}).map((entry) => entry.family),
		).toEqual(["Playfair Display"]);
		expect(
			filterFontCatalog(ENTRIES, {
				query: "",
				category: "all",
				subset: "latin-ext",
				sort: "popularity",
			}).map((entry) => entry.family),
		).toEqual(["Playfair Display", "Inter"]);
	});
});

describe("catalogSubsets", () => {
	it("lista subconjuntos únicos ordenados", () => {
		expect(catalogSubsets(ENTRIES)).toEqual(["latin", "latin-ext"]);
	});
});

describe("estimateFontPayload", () => {
	it("multiplica pesos × estilos × subconjuntos latinos", () => {
		expect(
			estimateFontPayload(
				{ subsets: ["latin", "latin-ext"] },
				[400, 700],
				false,
			),
		).toEqual({ files: 4, kb: 72 });
		expect(
			estimateFontPayload({ subsets: ["latin"] }, [400], false),
		).toEqual({ files: 1, kb: 18 });
	});
});

describe("defaultFontForRole", () => {
	it("devolve REM p/ títulos e Hanken p/ texto", () => {
		expect(defaultFontForRole("heading").family).toBe("REM");
		expect(defaultFontForRole("body").family).toBe("Hanken Grotesk");
	});
});
