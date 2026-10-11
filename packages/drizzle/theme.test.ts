import { describe, expect, it } from "vitest";

import {
	DEFAULT_THEME,
	eventThemeSchema,
	parseEventTheme,
	presetFont,
	presetOfFamily,
} from "./theme";

describe("seleções de fonte (formato atual, sem legado)", () => {
	it("preserva seleções com pesos e categoria", () => {
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

	it("rejeita presets legados (string) e valores inválidos", () => {
		expect(
			eventThemeSchema.safeParse({
				fonts: { heading: "sora", body: "inter" },
			}).success,
		).toBe(false);
		expect(
			eventThemeSchema.safeParse({
				fonts: {
					heading: { family: "", weights: [] },
					body: presetFont("inter"),
				},
			}).success,
		).toBe(false);
	});
});

describe("compatibilidade com temas armazenados", () => {
	it("lê JSON no formato atual", () => {
		const theme = parseEventTheme({
			theme: {
				version: 2,
				primary: "#123456",
				secondary: "#654321",
				fonts: {
					heading: presetFont("space-grotesk"),
					body: presetFont("hanken-grotesk"),
				},
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
