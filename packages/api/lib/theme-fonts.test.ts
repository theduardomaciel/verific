import { describe, expect, it } from "vitest";

import { DEFAULT_THEME } from "@verific/drizzle/theme";

import { normalizeThemeFonts } from "./theme-fonts";

describe("normalizeThemeFonts", () => {
	it("normaliza a categoria a partir do catálogo", () => {
		const theme = normalizeThemeFonts({
			...DEFAULT_THEME,
			fonts: {
				heading: {
					family: "Playfair Display",
					weights: [700, 400],
					category: "sans-serif",
				},
				body: { family: "inter", weights: [400] },
			},
		});
		expect(theme.fonts.heading).toEqual({
			family: "Playfair Display",
			weights: [400, 700],
			category: "serif",
		});
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
					heading: { family: "Comic Papyrus", weights: [400] },
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
					heading: { family: "Bebas Neue", weights: [700] },
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
					},
				},
			}),
		).toThrow(/itálico/);
	});
});
