import { describe, expect, it } from "vitest";

import { DEFAULT_THEME } from "@verific/drizzle/theme";

import { normalizeThemeFonts } from "./theme-fonts";

describe("normalizeThemeFonts", () => {
	it("normaliza a categoria a partir do catálogo (três papéis)", () => {
		const theme = normalizeThemeFonts({
			...DEFAULT_THEME,
			fonts: {
				heading: {
					family: "Playfair Display",
					weights: [700, 400],
					category: "sans-serif",
					scale: 0.9,
				},
				subtitle: {
					family: "Playfair Display",
					weights: [700],
					category: "sans-serif",
					scale: 1,
				},
				body: {
					family: "inter",
					weights: [400],
					category: "sans-serif",
					scale: 1,
				},
			},
		});
		expect(theme.fonts.heading).toEqual({
			family: "Playfair Display",
			weights: [400, 700],
			category: "serif",
			scale: 0.9,
		});
		expect(theme.fonts.subtitle.family).toBe("Playfair Display");
		expect(theme.fonts.body.family).toBe("Inter");
	});

	it("aceita os presets migrados", () => {
		expect(() => normalizeThemeFonts(DEFAULT_THEME)).not.toThrow();
	});

	it("rejeita família desconhecida", () => {
		expect(() =>
			normalizeThemeFonts({
				...DEFAULT_THEME,
				fonts: {
					...DEFAULT_THEME.fonts,
					heading: {
						family: "Comic Papyrus",
						weights: [400],
						category: "sans-serif",
						scale: 1,
					},
				},
			}),
		).toThrow(/desconhecida/);
	});

	it("rejeita peso que a fonte não oferece", () => {
		expect(() =>
			normalizeThemeFonts({
				...DEFAULT_THEME,
				fonts: {
					...DEFAULT_THEME.fonts,
					heading: {
						family: "Bebas Neue",
						weights: [700],
						category: "sans-serif",
						scale: 1,
					},
				},
			}),
		).toThrow(/peso 700/);
	});

	it("rejeita itálico sem suporte", () => {
		expect(() =>
			normalizeThemeFonts({
				...DEFAULT_THEME,
				fonts: {
					...DEFAULT_THEME.fonts,
					heading: {
						family: "Bebas Neue",
						weights: [400],
						italic: true,
						category: "sans-serif",
						scale: 1,
					},
				},
			}),
		).toThrow(/itálico/);
	});

	it("rejeita escala fora do limite do papel", () => {
		expect(() =>
			normalizeThemeFonts({
				...DEFAULT_THEME,
				fonts: {
					...DEFAULT_THEME.fonts,
					body: {
						family: "Inter",
						weights: [400],
						category: "sans-serif",
						scale: 1.5,
					},
				},
			}),
		).toThrow();
	});
});
