import { describe, expect, it } from "vitest";

import {
	DEFAULT_THEME,
	eventThemeSchema,
	parseEventTheme,
	presetFont,
	presetOfFamily,
} from "./theme";

describe("seleções de fonte (três papéis + escala)", () => {
	it("preserva seleções com pesos, categoria e escala", () => {
		const parsed = eventThemeSchema.parse({
			fonts: {
				heading: {
					family: "Playfair Display",
					weights: [700],
					category: "serif",
					scale: 0.9,
				},
				subtitle: {
					family: "Inter",
					weights: [500],
					scale: 1,
				},
				body: { family: "Inter", weights: [400] },
			},
		});
		expect(parsed.fonts.heading).toEqual({
			family: "Playfair Display",
			weights: [700],
			category: "serif",
			scale: 0.9,
		});
		expect(parsed.fonts.subtitle).toMatchObject({ family: "Inter" });
		expect(parsed.fonts.body.scale).toBe(1);
	});

	it("usa o padrão nos papéis ausentes", () => {
		const parsed = eventThemeSchema.parse({});
		expect(parsed.fonts.heading.family).toBe("REM");
		expect(parsed.fonts.subtitle.family).toBe("REM");
		expect(parsed.fonts.body.family).toBe("Hanken Grotesk");
	});

	it("subtitle ausente copia o heading do próprio tema", () => {
		const parsed = eventThemeSchema.parse({
			fonts: {
				heading: {
					family: "Playfair Display",
					weights: [700],
					category: "serif",
					scale: 0.9,
				},
				body: { family: "Inter", weights: [400] },
			},
		});
		expect(parsed.fonts.subtitle).toEqual(parsed.fonts.heading);
	});

	it("tema antigo com título personalizado renderiza idêntico", () => {
		const theme = parseEventTheme({
			theme: {
				version: 2,
				primary: "#123456",
				secondary: "#654321",
				fonts: {
					heading: {
						family: "Playfair Display",
						weights: [700],
						category: "serif",
					},
					body: { family: "Inter", weights: [400] },
				},
			},
		});
		// Subtítulos herdam o título: mesma família, pesos e escala.
		expect(theme.fonts.subtitle).toEqual(theme.fonts.heading);
		expect(theme.fonts.body.family).toBe("Inter");
	});

	it("rejeita escala fora do limite do papel", () => {
		expect(
			eventThemeSchema.safeParse({
				fonts: {
					heading: { family: "Inter", weights: [400], scale: 1.6 },
					body: presetFont("inter"),
				},
			}).success,
		).toBe(false);
		// Texto é mais restrito (0.75–1.25) que títulos (0.5–1.5).
		expect(
			eventThemeSchema.safeParse({
				fonts: {
					heading: presetFont("rem"),
					body: { family: "Inter", weights: [400], scale: 1.3 },
				},
			}).success,
		).toBe(false);
		expect(
			eventThemeSchema.safeParse({
				fonts: {
					heading: presetFont("rem"),
					body: { family: "Inter", weights: [400], scale: 1.25 },
				},
			}).success,
		).toBe(true);
	});
});

describe("compatibilidade com temas armazenados", () => {
	it("o tema padrão tem seleções válidas nos três papéis", () => {
		expect(DEFAULT_THEME.fonts.heading.weights.length).toBeGreaterThan(0);
		expect(DEFAULT_THEME.fonts.subtitle.family).toBe("REM");
		expect(DEFAULT_THEME.fonts.body.weights.length).toBeGreaterThan(0);
	});
});

describe("presetFont / presetOfFamily", () => {
	it("gera seleções canônicas e reconhece as famílias", () => {
		expect(presetFont("rem")).toMatchObject({ family: "REM", scale: 1 });
		expect(presetOfFamily("REM")).toBe("rem");
		expect(presetOfFamily("Hanken-Grotesk")).toBe("hanken-grotesk");
		expect(presetOfFamily("HankenGrotesk")).toBeNull();
		expect(presetOfFamily("Playfair Display")).toBeNull();
	});
});
