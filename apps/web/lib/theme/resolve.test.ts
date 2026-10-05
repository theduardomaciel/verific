import { describe, expect, it } from "vitest";

import {
	bestOnColor,
	contrastRatio,
	resolveEventTheme,
} from "./resolve";

describe("theme resolve", () => {
	it("usa o tema padrão verifIC (roxo + teal)", () => {
		const { theme } = resolveEventTheme({});
		expect(theme.primary).toBe("#6D28D9");
		expect(theme.secondary).toBe("#14B8A6");
		expect(theme.header).toMatchObject({ bg: "primary", style: "solid" });
		expect(theme.footer).toMatchObject({ bg: "primary" });
	});

	it("deriva texto branco sobre o roxo padrão (AA)", () => {
		const { onPrimary, onSecondary } = resolveEventTheme({});
		expect(onPrimary).toBe("#FFFFFF");
		expect(contrastRatio(onPrimary, "#6D28D9")).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(onSecondary, "#14B8A6")).toBeGreaterThanOrEqual(4.5);
	});

	it("prefere texto escuro sobre amarelo claro", () => {
		expect(bestOnColor("#FACC15")).toBe("#141118");
	});

	it("usa cores legadas como fallback", () => {
		const { theme } = resolveEventTheme({
			primaryColor: "#123456",
			secondaryColor: "#ABCDEF",
		});
		expect(theme.primary).toBe("#123456");
		expect(theme.secondary).toBe("#ABCDEF");
	});

	it("emite variáveis semânticas (sem cores chapadas)", () => {
		const { cssVars } = resolveEventTheme({});
		expect(cssVars["--primary"]).toBe("#6D28D9");
		expect(cssVars["--ev-header-bg"]).toBe("#6D28D9");
		expect(cssVars["--ev-footer-bg"]).toBe("#6D28D9");
		expect(cssVars["--ev-card-radius"]).toBe("24px");
	});

	it("deriva --accent do content.accent e --ev-loader oposto ao header", () => {
		// Padrão: header primário sólido → loader secundário, accent primário.
		const def = resolveEventTheme({});
		expect(def.cssVars["--accent"]).toBe("#6D28D9");
		expect(def.cssVars["--accent-foreground"]).toBe(def.onPrimary);
		expect(def.cssVars["--ev-loader"]).toBe("#14B8A6");

		// Header secundário sólido → loader primário.
		const sec = resolveEventTheme({
			theme: { version: 1, header: { bg: "secondary", style: "solid" } },
		});
		expect(sec.cssVars["--ev-loader"]).toBe(sec.theme.primary);

		// Gradiente usa ambas → secundária; transparente → primária.
		const grad = resolveEventTheme({
			theme: { version: 1, header: { bg: "primary", style: "gradient" } },
		});
		expect(grad.cssVars["--ev-loader"]).toBe(grad.theme.secondary);
		const transp = resolveEventTheme({
			theme: {
				version: 1,
				header: { bg: "secondary", style: "transparent" },
			},
		});
		expect(transp.cssVars["--ev-loader"]).toBe(transp.theme.primary);

		// content.accent secundário → accent secundário com contraste próprio.
		const acc = resolveEventTheme({
			theme: { version: 1, content: { accent: "secondary" } },
		});
		expect(acc.cssVars["--accent"]).toBe(acc.theme.secondary);
		expect(acc.cssVars["--accent-foreground"]).toBe(acc.onSecondary);
	});

	it("header transparente e fundo em grade via tema", () => {
		const { cssVars } = resolveEventTheme({
			theme: {
				version: 1,
				header: { bg: "primary", style: "transparent" },
				page: {
					effect: "grid",
					effectSize: 32,
					effectOpacity: 0.12,
					effectColor: "primary",
					topGradient: null,
					bottomGradient: null,
				},
			},
		});
		expect(cssVars["--ev-header-bg"]).toBe("transparent");
		expect(cssVars["--ev-bg-image"]).toContain("linear-gradient");
	});

	it("gradiente com parada transparente e efeito neutro", () => {
		const { cssVars } = resolveEventTheme({
			theme: {
				version: 1,
				page: {
					effect: "grid",
					effectSize: 32,
					effectOpacity: 0.12,
					effectColor: "foreground",
					topGradient: {
						height: 240,
						from: "secondary",
						to: "transparent",
						opacity: 0.35,
					},
					bottomGradient: null,
				},
			},
		});
		expect(cssVars["--ev-bg-image"]).toContain("var(--foreground)");
		expect(cssVars["--ev-top-gradient"]).toContain("transparent");
	});
});
