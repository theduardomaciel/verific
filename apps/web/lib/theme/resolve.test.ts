import { describe, expect, it } from "vitest";

import {
	bestOnColor,
	bestOnColors,
	contrastRatio,
	darkenUntilContrast,
	mixHex,
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
		expect(cssVars["--ev-header-fg"]).toBe("#FFFFFF");
		expect(cssVars["--ev-footer-fg"]).toBe("#FFFFFF");
		expect(cssVars["--ev-card-radius"]).toBe("24px");
	});

	it("mantém o texto suave do cabeçalho acima de AA", () => {
		// O alpha derivado precisa continuar legível sobre o fundo roxo.
		for (const header of [
			{ bg: "primary", style: "solid" },
			{ bg: "secondary", style: "solid" },
		] as const) {
			const { cssVars } = resolveEventTheme({
				theme: { version: 1, header },
			});
			const soft = cssVars["--ev-header-fg-soft"]!;
			const pct = Number(/(\d+)%/.exec(soft)?.[1]);
			expect(pct).toBeGreaterThan(0);

			const bg = cssVars["--ev-header-bg"]!;
			const fg = cssVars["--ev-header-fg"]!;
			const composited = mixHex(bg, fg, pct / 100);
			expect(contrastRatio(composited, bg)).toBeGreaterThanOrEqual(4.5);
		}
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

	it("deriva --ev-skeleton-bg do content.skeleton (padrão neutro)", () => {
		const def = resolveEventTheme({});
		expect(def.cssVars["--ev-skeleton-bg"]).toBe("var(--border)");

		const pri = resolveEventTheme({
			theme: { version: 1, content: { skeleton: "primary" } },
		});
		expect(pri.cssVars["--ev-skeleton-bg"]).toBe(pri.theme.primary);

		const sec = resolveEventTheme({
			theme: { version: 1, content: { skeleton: "secondary" } },
		});
		expect(sec.cssVars["--ev-skeleton-bg"]).toBe(sec.theme.secondary);
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

	describe("capa", () => {
		// Rosa-claro de propósito: escolher a secundária como véu não pode
		// quebrar o branco da capa.
		const LIGHT_SECONDARY = "#F0ABFC";

		it("usa a primária por padrão e o texto é sempre branco", () => {
			const { theme, cssVars } = resolveEventTheme({});
			expect(theme.hero.overlayColor).toBe("primary");
			expect(cssVars["--ev-hero-tint"]).toBe(
				darkenUntilContrast("#6D28D9"),
			);
			expect(cssVars["--ev-hero-overlay-opacity"]).toBe("0.45");
		});

		it("escurece a cor escolhida até o branco passar AA", () => {
			for (const overlayColor of ["primary", "secondary", "dark"] as const) {
				const { cssVars } = resolveEventTheme({
					theme: {
						version: 1,
						secondary: LIGHT_SECONDARY,
						hero: { overlayColor },
					},
				});
				const tint = cssVars["--ev-hero-tint"]!;
				expect(contrastRatio("#FFFFFF", tint)).toBeGreaterThanOrEqual(4.5);
			}
		});

		it("a opção 'dark' é um quase-preto neutro, independente do tema", () => {
			const a = resolveEventTheme({
				theme: { version: 1, hero: { overlayColor: "dark" } },
			});
			const b = resolveEventTheme({
				theme: {
					version: 1,
					primary: "#166534",
					secondary: "#84CC16",
					hero: { overlayColor: "dark" },
				},
			});
			expect(a.cssVars["--ev-hero-tint"]).toBe(b.cssVars["--ev-hero-tint"]);
		});
	});

	describe("navegação do cabeçalho", () => {
		it("realce oposto no sólido: ativo nunca some no fundo", () => {
			const { cssVars, theme } = resolveEventTheme({
				theme: { version: 1, header: { bg: "primary", style: "solid" } },
			});
			// Ativo = secundária sobre fundo primário (o bug antigo usava a
			// primária e o item virava invisível).
			expect(cssVars["--ev-nav-active-bg"]).toBe(theme.secondary);
			expect(contrastRatio(cssVars["--ev-nav-active-fg"]!, theme.secondary))
				.toBeGreaterThanOrEqual(4.5);
			expect(cssVars["--ev-nav-active-bg"]).not.toBe(theme.primary);

			const sec = resolveEventTheme({
				theme: { version: 1, header: { bg: "secondary", style: "solid" } },
			});
			expect(sec.cssVars["--ev-nav-active-bg"]).toBe(sec.theme.primary);
		});

		it("gradiente usa o texto de melhor contraste mínimo entre as paradas", () => {
			const { cssVars, theme } = resolveEventTheme({
				theme: {
					version: 1,
					primary: "#6D28D9",
					secondary: "#F0ABFC",
					header: { bg: "primary", style: "gradient" },
				},
			});
			// Não dá para escolher branco nem escuro: a cor clara do
			// gradiente reprova com um deles.
			expect(cssVars["--ev-header-fg"]).toBe(bestOnColors([
				theme.secondary,
				theme.primary,
			]));
			// Nenhuma das duas opções atinge AA nas duas paradas, então a
			// escolha é pelo maior contraste *mínimo* — não por um papel fixo.
			const fg = cssVars["--ev-nav-fg"]!;
			const worst = (color: string) =>
				Math.min(
					contrastRatio(color, theme.secondary),
					contrastRatio(color, theme.primary),
				);
			expect(worst(fg)).toBeGreaterThanOrEqual(
				Math.max(worst("#FFFFFF"), worst("#141118")),
			);

			// Highlight é véu da própria cor de texto, nunca um papel do tema.
			expect(cssVars["--ev-nav-hover-bg"]).toContain(
				cssVars["--ev-nav-fg"]!,
			);
			expect(cssVars["--ev-nav-hover-bg"]).not.toContain(theme.primary);
			expect(cssVars["--ev-nav-hover-bg"]).not.toContain(theme.secondary);
		});

		it("transparente: texto e menu seguem a página, não o header", () => {
			const { cssVars } = resolveEventTheme({
				theme: {
					version: 1,
					header: { bg: "primary", style: "transparent" },
				},
			});
			expect(cssVars["--ev-header-fg"]).toBe("var(--foreground)");
			expect(cssVars["--ev-nav-fg"]).toBe("var(--foreground)");
			expect(cssVars["--ev-mobile-menu-bg"]).toBe("var(--background)");
			expect(cssVars["--ev-mobile-menu-fg"]).toBe("var(--foreground)");
		});

		it("menu mobile usa uma cor sólida no gradiente", () => {
			const { cssVars, theme } = resolveEventTheme({
				theme: { version: 1, header: { bg: "primary", style: "gradient" } },
			});
			expect([theme.primary, theme.secondary]).toContain(
				cssVars["--ev-mobile-menu-bg"],
			);
			expect(
				contrastRatio(
					cssVars["--ev-mobile-menu-fg"]!,
					cssVars["--ev-mobile-menu-bg"]!,
				),
			).toBeGreaterThanOrEqual(4.5);
		});
	});
});
