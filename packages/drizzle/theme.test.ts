import { describe, expect, it } from "vitest";

import {
	DEFAULT_THEME,
	eventThemeSchema,
	parseEventTheme,
	presetFont,
	presetOfFamily,
} from "./theme";

describe("migração de presets legados", () => {
	it("converte presets (string) em seleções", () => {
		const parsed = eventThemeSchema.parse({
			fonts: { heading: "sora", body: "inter" },
		});
		expect(parsed.fonts.heading).toMatchObject({
			family: "Sora",
			category: "sans-serif",
		});
		expect(parsed.fonts.heading.weights).toContain(400);
		expect(parsed.fonts.body.family).toBe("Inter");
	});

	it("preserva seleções novas com pesos e categoria", () => {
		const parsed = eventThemeSchema.parse({
			fonts: {
				heading: {
					family: "Playfair Display",
					weights: [700],
					category: "serif",
				},
				body: { family: "Inter", weights: [400] },
			},
		});
		expect(parsed.fonts.heading).toEqual({
			family: "Playfair Display",
			weights: [700],
			category: "serif",
		});
		expect(parsed.fonts.body.category).toBe("sans-serif");
	});

	it("usa o padrão nos papéis ausentes e preenche a categoria", () => {
		const parsed = eventThemeSchema.parse({});
		expect(parsed.fonts.heading.family).toBe("REM");
		expect(parsed.fonts.body.family).toBe("Hanken Grotesk");
		expect(parsed.fonts.heading.category).toBe("sans-serif");
	});

	it("recupera valores inválidos com o padrão do papel", () => {
		const parsed = eventThemeSchema.parse({
			fonts: {
				heading: "fonte-qualquer",
				body: { family: "", weights: [] },
			},
		});
		expect(parsed.fonts.heading.family).toBe("REM");
		expect(parsed.fonts.body.family).toBe("Hanken Grotesk");
	});
});

describe("compatibilidade com temas armazenados", () => {
	it("lê JSON antigo com presets sem quebrar", () => {
		const theme = parseEventTheme({
			theme: {
				version: 2,
				primary: "#123456",
				secondary: "#654321",
				fonts: { heading: "space-grotesk", body: "hanken-grotesk" },
			},
		});
		expect(theme.fonts.heading.family).toBe("Space Grotesk");
		expect(theme.fonts.body.family).toBe("Hanken Grotesk");
		expect(theme.primary).toBe("#123456");
	});

	it("o tema padrão tem seleções válidas nos dois papéis", () => {
		expect(DEFAULT_THEME.fonts.heading.weights.length).toBeGreaterThan(0);
		expect(DEFAULT_THEME.fonts.body.weights.length).toBeGreaterThan(0);
	});
});

describe("presetFont / presetOfFamily", () => {
	it("gera seleções canônicas e reconhece as famílias", () => {
		expect(presetFont("rem").family).toBe("REM");
		expect(presetOfFamily("REM")).toBe("rem");
		expect(presetOfFamily("Hanken-Grotesk")).toBe("hanken-grotesk");
		expect(presetOfFamily("HankenGrotesk")).toBeNull();
		expect(presetOfFamily("Playfair Display")).toBeNull();
	});
});
