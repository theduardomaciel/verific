import { describe, expect, it } from "vitest";

import {
	buildFontPreviewUrl,
	buildFontStack,
	buildFontStylesheetUrl,
	hasLatin,
	hasLatinExt,
	normalizeFamily,
	slugifyFamily,
} from "./helpers";

describe("buildFontStack", () => {
	it("cita a família e usa o fallback da categoria", () => {
		expect(buildFontStack("Inter", "sans-serif")).toBe(
			'"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
		);
	});

	it("usa fallback serif para serifadas", () => {
		expect(buildFontStack("Playfair Display", "serif")).toContain(
			"Georgia",
		);
	});

	it("usa fallback genérico sem categoria (páginas públicas sem catálogo)", () => {
		expect(buildFontStack("Inter")).toContain("system-ui");
	});
});

describe("buildFontStylesheetUrl", () => {
	it("monta URL css2 com display=swap e só as famílias/pesos dados", () => {
		const url = buildFontStylesheetUrl([
			{ family: "Inter", weights: [400, 700] },
			{ family: "Playfair Display", weights: [700] },
		]);
		expect(url).toBe(
			"https://fonts.googleapis.com/css2" +
				"?family=Inter:wght@400;700&family=Playfair+Display:wght@700&display=swap",
		);
	});

	it("ordena e deduplica pesos", () => {
		const url = buildFontStylesheetUrl([
			{ family: "Inter", weights: [700, 400, 400] },
		]);
		expect(url).toContain("family=Inter:wght@400;700");
	});

	it("inclui o eixo itálico quando pedido", () => {
		const url = buildFontStylesheetUrl([
			{ family: "Inter", weights: [400], italic: true },
		]);
		expect(url).toContain("family=Inter:ital,wght@0,400;1,400");
	});

	it("rejeita família com caracteres inseguros e lista vazia", () => {
		expect(() => buildFontStylesheetUrl([])).toThrow();
		expect(() =>
			buildFontStylesheetUrl([
				{ family: "Inter</style>", weights: [400] },
			]),
		).toThrow();
	});
});

describe("buildFontPreviewUrl", () => {
	it("usa text= com os glifos do nome", () => {
		const url = buildFontPreviewUrl("Caveat", "Caveat");
		expect(url).toContain("family=Caveat:wght@400");
		expect(url).toContain("text=");
		expect(url).toContain("display=swap");
	});
});

describe("normalizeFamily / slugifyFamily", () => {
	it("normaliza caixa e hífens", () => {
		expect(normalizeFamily("Hanken-Grotesk")).toBe("hanken grotesk");
		expect(normalizeFamily("  REM ")).toBe("rem");
	});

	it("gera slug determinístico sem acentos", () => {
		expect(slugifyFamily("Hanken Grotesk")).toBe("hanken-grotesk");
		expect(slugifyFamily("Exo 2")).toBe("exo-2");
		expect(() => slugifyFamily("   ")).toThrow();
	});
});

describe("hasLatinExt / hasLatin", () => {
	it("detecta cobertura de acentos do português", () => {
		expect(hasLatinExt({ subsets: ["latin", "latin-ext"] })).toBe(true);
		expect(hasLatinExt({ subsets: ["latin"] })).toBe(false);
		expect(hasLatin({ subsets: ["latin"] })).toBe(true);
		expect(hasLatin({ subsets: ["cyrillic"] })).toBe(false);
	});
});
