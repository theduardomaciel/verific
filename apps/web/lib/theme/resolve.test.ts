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
		expect(contrastRatio(onSecondary, "#14B8A6")).toBeGreaterThanOrEqual(
			4.5,
		);
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
				theme: { version: 2, header },
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
			theme: { version: 2, header: { bg: "secondary", style: "solid" } },
		});
		expect(sec.cssVars["--ev-loader"]).toBe(sec.theme.primary);

		// Gradiente usa ambas → secundária; transparente → primária.
		const grad = resolveEventTheme({
			theme: { version: 2, header: { bg: "primary", style: "gradient" } },
		});
		expect(grad.cssVars["--ev-loader"]).toBe(grad.theme.secondary);
		const transp = resolveEventTheme({
			theme: {
				version: 2,
				header: { bg: "secondary", style: "transparent" },
			},
		});
		expect(transp.cssVars["--ev-loader"]).toBe(transp.theme.primary);

		// content.accent secundário → accent secundário com contraste próprio.
		const acc = resolveEventTheme({
			theme: { version: 2, content: { accent: "secondary" } },
		});
		expect(acc.cssVars["--accent"]).toBe(acc.theme.secondary);
		expect(acc.cssVars["--accent-foreground"]).toBe(acc.onSecondary);
	});

	it("deriva --ev-skeleton-bg do content.skeleton (padrão neutro)", () => {
		const def = resolveEventTheme({});
		expect(def.cssVars["--ev-skeleton-bg"]).toBe("var(--border)");

		const pri = resolveEventTheme({
			theme: { version: 2, content: { skeleton: "primary" } },
		});
		expect(pri.cssVars["--ev-skeleton-bg"]).toBe(pri.theme.primary);

		const sec = resolveEventTheme({
			theme: { version: 2, content: { skeleton: "secondary" } },
		});
		expect(sec.cssVars["--ev-skeleton-bg"]).toBe(sec.theme.secondary);
	});

	it("header transparente e fundo em grade via tema", () => {
		const { cssVars } = resolveEventTheme({
			theme: {
				version: 2,
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

	it("gradiente com paradas de cor + opacidade e efeito neutro", () => {
		const { cssVars } = resolveEventTheme({
			theme: {
				version: 2,
				page: {
					effect: "grid",
					effectSize: 32,
					effectOpacity: 0.12,
					effectColor: "foreground",
					topGradient: {
						height: 240,
						from: { color: "secondary", opacity: 0.35 },
						to: { color: "background", opacity: 0 },
					},
					bottomGradient: null,
				},
			},
		});
		expect(cssVars["--ev-bg-image"]).toContain("var(--foreground)");
		// Cada parada leva a própria opacidade via `color-mix` (sem franja
		// cinza); `background @ 0%` é o "transparente" que resolve por modo.
		expect(cssVars["--ev-top-gradient"]).toContain(
			"color-mix(in srgb, #14B8A6 35%, transparent)",
		);
		expect(cssVars["--ev-top-gradient"]).toContain(
			"color-mix(in srgb, var(--background) 0%, transparent)",
		);
		expect(cssVars["--ev-top-height"]).toBe("240px");
	});

	it("gradiente com altura da capa sai da página e vai para a capa", () => {
		const { cssVars } = resolveEventTheme({
			theme: {
				version: 2,
				page: {
					topGradient: {
						height: "hero",
						from: { color: "background", opacity: 0.5 },
						to: { color: "primary", opacity: 0.25 },
					},
				},
			},
		});
		// Na página: nada (altura zero); a capa desenha `--ev-hero-bg`.
		expect(cssVars["--ev-top-gradient"]).toBe("none");
		expect(cssVars["--ev-top-height"]).toBe("0px");
		expect(cssVars["--ev-hero-bg"]).toContain("linear-gradient(180deg,");
		expect(cssVars["--ev-hero-bg"]).toContain(
			"color-mix(in srgb, var(--background) 50%, transparent)",
		);
		expect(cssVars["--ev-hero-bg"]).toContain(
			"color-mix(in srgb, #6D28D9 25%, transparent)",
		);
	});

	it("altura da capa no gradiente inferior é ignorada (só o topo usa)", () => {
		const { cssVars } = resolveEventTheme({
			theme: {
				version: 2,
				page: {
					bottomGradient: {
						height: "hero",
						from: { color: "primary", opacity: 1 },
						to: { color: "secondary", opacity: 1 },
					},
				},
			},
		});
		expect(cssVars["--ev-bottom-gradient"]).toBe("none");
		expect(cssVars["--ev-bottom-height"]).toBe("0px");
	});

	it("sem filete por padrão; com filete resolve cor e espessura", () => {
		const def = resolveEventTheme({});
		expect(def.theme.hero.border).toBeNull();
		expect(def.cssVars["--ev-hero-border-width"]).toBe("0px");
		expect(def.cssVars["--ev-hero-border"]).toBe("transparent");

		const { cssVars, theme } = resolveEventTheme({
			theme: {
				version: 2,
				hero: { border: { width: 6, color: "secondary" } },
			},
		});
		expect(theme.hero.border).toMatchObject({
			width: 6,
			color: "secondary",
		});
		expect(cssVars["--ev-hero-border-width"]).toBe("6px");
		expect(cssVars["--ev-hero-border"]).toBe(theme.secondary);
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
			for (const overlayColor of [
				"primary",
				"secondary",
				"dark",
			] as const) {
				const { cssVars } = resolveEventTheme({
					theme: {
						version: 2,
						secondary: LIGHT_SECONDARY,
						hero: { overlayColor },
					},
				});
				const tint = cssVars["--ev-hero-tint"]!;
				expect(contrastRatio("#FFFFFF", tint)).toBeGreaterThanOrEqual(
					4.5,
				);
			}
		});

		it("a opção 'dark' é um quase-preto neutro, independente do tema", () => {
			const a = resolveEventTheme({
				theme: { version: 2, hero: { overlayColor: "dark" } },
			});
			const b = resolveEventTheme({
				theme: {
					version: 2,
					primary: "#166534",
					secondary: "#84CC16",
					hero: { overlayColor: "dark" },
				},
			});
			expect(a.cssVars["--ev-hero-tint"]).toBe(
				b.cssVars["--ev-hero-tint"],
			);
		});
	});

	describe("navegação do cabeçalho", () => {
		it("ativo é a superfície de conteúdo (accent), com texto AA", () => {
			// Padrão: destaque primário em qualquer estilo de cabeçalho —
			// inclusive no sólido primário (era o bug antigo do item sumido).
			for (const style of ["solid", "gradient", "transparent"] as const) {
				const { cssVars, theme } = resolveEventTheme({
					theme: { version: 2, header: { bg: "primary", style } },
				});
				expect(cssVars["--ev-nav-active-bg"]).toBe(theme.primary);
				expect(
					contrastRatio(
						cssVars["--ev-nav-active-fg"]!,
						theme.primary,
					),
				).toBeGreaterThanOrEqual(4.5);
			}

			// Destaque secundário segue o papel.
			const sec = resolveEventTheme({
				theme: { version: 2, content: { accent: "secondary" } },
			});
			expect(sec.cssVars["--ev-nav-active-bg"]).toBe(sec.theme.secondary);
			expect(
				contrastRatio(
					sec.cssVars["--ev-nav-active-fg"]!,
					sec.theme.secondary,
				),
			).toBeGreaterThanOrEqual(4.5);
		});

		it("accent neutro: ativo resolve por modo, texto sempre AA", () => {
			const { cssVars } = resolveEventTheme({
				theme: { version: 2, content: { accent: "foreground" } },
			});
			expect(cssVars["--ev-nav-active-bg"]).toBe("var(--foreground)");
			expect(cssVars["--ev-nav-active-fg"]).toBe("var(--background)");
			expect(cssVars["--ev-nav-active-bg-dark"]).toBe(
				"var(--foreground)",
			);
			expect(cssVars["--ev-nav-active-fg-dark"]).toBe(
				"var(--background)",
			);
		});

		it("accentDark: primária no claro, neutra no escuro", () => {
			const { cssVars, theme, onPrimary } = resolveEventTheme({
				theme: {
					version: 2,
					content: { accent: "primary", accentDark: "foreground" },
				},
			});
			expect(cssVars["--ev-nav-active-bg"]).toBe(theme.primary);
			expect(cssVars["--ev-nav-active-fg"]).toBe(onPrimary);
			expect(cssVars["--ev-nav-active-bg-dark"]).toBe(
				"var(--foreground)",
			);
			expect(cssVars["--ev-nav-active-fg-dark"]).toBe(
				"var(--background)",
			);

			// Selos acompanham: neutros no escuro com texto roxo (passa AA
			// no branco) e contraste derivado no claro.
			expect(cssVars["--ev-badge-bg"]).toBe(theme.primary);
			expect(cssVars["--ev-badge-bg-dark"]).toBe("var(--foreground)");
			expect(cssVars["--ev-badge-fg-dark"]).toBe(theme.primary);
			expect(
				contrastRatio(theme.primary, "#FFFFFF"),
			).toBeGreaterThanOrEqual(4.5);
			// Primária sobre o neutro claro reprova → texto derivado (branco).
			expect(contrastRatio(theme.primary, "#333333")).toBeLessThan(4.5);
			expect(cssVars["--ev-badge-fg"]).toBe("#FFFFFF");
		});

		it("CTA é contorno na cor dos botões, texto na cor do cabeçalho", () => {
			// Sólido primário + botões secundários: borda teal, texto branco
			// (a cor derivada do cabeçalho).
			const solid = resolveEventTheme({});
			expect(solid.cssVars["--ev-cta-border"]).toBe(
				solid.theme.secondary,
			);
			expect(solid.cssVars["--ev-cta-fg"]).toBe(
				solid.cssVars["--ev-header-fg"],
			);
			expect(solid.cssVars["--ev-cta-hover-bg"]).toBe(
				solid.theme.secondary,
			);
			expect(
				contrastRatio(
					solid.cssVars["--ev-cta-hover-fg"]!,
					solid.theme.secondary,
				),
			).toBeGreaterThanOrEqual(4.5);

			// Transparente: texto segue a página.
			const transp = resolveEventTheme({
				theme: {
					version: 2,
					header: { bg: "primary", style: "transparent" },
				},
			});
			expect(transp.cssVars["--ev-cta-border"]).toBe(
				transp.theme.secondary,
			);
			expect(transp.cssVars["--ev-cta-fg"]).toBe("var(--foreground)");

			// Botões primários: CTA acompanha (borda primária).
			const pri = resolveEventTheme({
				theme: { version: 2, buttons: { bg: "primary" } },
			});
			expect(pri.cssVars["--ev-cta-border"]).toBe(pri.theme.primary);
			expect(pri.cssVars["--ev-cta-hover-fg"]).toBe(pri.onPrimary);
		});

		it("gradiente usa o texto de melhor contraste mínimo entre as paradas", () => {
			const { cssVars, theme } = resolveEventTheme({
				theme: {
					version: 2,
					primary: "#6D28D9",
					secondary: "#F0ABFC",
					header: { bg: "primary", style: "gradient" },
				},
			});
			// Não dá para escolher branco nem escuro: a cor clara do
			// gradiente reprova com um deles.
			expect(cssVars["--ev-header-fg"]).toBe(
				bestOnColors([theme.secondary, theme.primary]),
			);
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
					version: 2,
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
				theme: {
					version: 2,
					header: { bg: "primary", style: "gradient" },
				},
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

	describe("referências SECOMP (só valores de tema)", () => {
		// Design A (claro) e B (escuro): um tema só — o modo resolve o resto.
		const SECOMP_2026 = {
			version: 2,
			primary: "#6D28D9",
			secondary: "#14B8A6",
			header: { bg: "primary", style: "transparent" },
			buttons: { bg: "secondary" },
			content: { accent: "primary", accentDark: "foreground" },
			hero: {
				image: false,
				border: { width: 6, color: "secondary" },
			},
			page: {
				effect: "grid",
				topGradient: {
					height: "hero",
					from: { color: "background", opacity: 0.5 },
					to: { color: "primary", opacity: 0.25 },
				},
				bottomGradient: {
					height: 400,
					from: { color: "background", opacity: 0 },
					to: { color: "primary", opacity: 0.25 },
				},
			},
		} as const;

		it("A: cabeçalho transparente, capa sem imagem, filete teal", () => {
			const { theme, cssVars } = resolveEventTheme({
				theme: SECOMP_2026,
			});
			expect(theme.hero.image).toBe(false);
			expect(cssVars["--ev-header-bg"]).toBe("transparent");
			// Sem imagem: sem véu na capa, texto segue a página.
			expect(cssVars["--ev-hero-fg"]).toBe("var(--foreground)");
			// Gradiente do topo da página até o filete (capa desenha).
			expect(cssVars["--ev-hero-bg"]).toContain(
				"linear-gradient(180deg,",
			);
			expect(cssVars["--ev-top-gradient"]).toBe("none");
			// Filete de 6px na cor dos botões.
			expect(cssVars["--ev-hero-border-width"]).toBe("6px");
			expect(cssVars["--ev-hero-border"]).toBe(theme.secondary);
			// CTA contorno teal, texto da página.
			expect(cssVars["--ev-cta-border"]).toBe(theme.secondary);
			expect(cssVars["--ev-cta-fg"]).toBe("var(--foreground)");
			// Claro: ativo e selos primários, texto AA.
			expect(cssVars["--ev-nav-active-bg"]).toBe(theme.primary);
			expect(
				contrastRatio(cssVars["--ev-nav-active-fg"]!, theme.primary),
			).toBeGreaterThanOrEqual(4.5);
			expect(cssVars["--ev-badge-bg"]).toBe(theme.primary);
		});

		it("B: mesmos valores, modo escuro resolve neutro + AA", () => {
			const { theme, cssVars } = resolveEventTheme({
				theme: SECOMP_2026,
			});
			// Escuro: ativo e selos neutros (branco), texto AA.
			expect(cssVars["--ev-nav-active-bg-dark"]).toBe(
				"var(--foreground)",
			);
			expect(cssVars["--ev-nav-active-fg-dark"]).toBe(
				"var(--background)",
			);
			expect(cssVars["--ev-badge-bg-dark"]).toBe("var(--foreground)");
			expect(cssVars["--ev-badge-fg-dark"]).toBe(theme.primary);
			expect(
				contrastRatio(theme.primary, "#FFFFFF"),
			).toBeGreaterThanOrEqual(4.5);
			// Teal e roxo não mudam com o modo.
			expect(cssVars["--ev-cta-border"]).toBe(theme.secondary);
			expect(cssVars["--ev-hero-border"]).toBe(theme.secondary);
			expect(cssVars["--ev-button-bg"]).toBe(theme.secondary);
		});

		it("C: cabeçalho sólido, capa com véu, conteúdo neutro", () => {
			const { theme, cssVars } = resolveEventTheme({
				theme: {
					version: 2,
					header: { bg: "primary", style: "solid" },
					buttons: { bg: "secondary" },
					content: { accent: "foreground" },
					hero: {
						image: true,
						overlayColor: "primary",
						border: { width: 6, color: "secondary" },
					},
					page: { effect: "none" },
				},
			});
			expect(cssVars["--ev-header-bg"]).toBe(theme.primary);
			// Com imagem: texto branco da capa + véu primário legível.
			expect(cssVars["--ev-hero-fg"]).toBe("#FFFFFF");
			expect(
				contrastRatio("#FFFFFF", cssVars["--ev-hero-tint"]!),
			).toBeGreaterThanOrEqual(4.5);
			// Ativo e selos neutros nos dois modos; selo escuro com roxo.
			expect(cssVars["--ev-nav-active-bg"]).toBe("var(--foreground)");
			expect(cssVars["--ev-badge-bg"]).toBe("var(--foreground)");
			expect(cssVars["--ev-badge-fg-dark"]).toBe(theme.primary);
			// CTA contorno teal, texto do cabeçalho (branco no roxo).
			expect(cssVars["--ev-cta-border"]).toBe(theme.secondary);
			expect(cssVars["--ev-cta-fg"]).toBe(cssVars["--ev-header-fg"]);
			// Filete + página sem efeito.
			expect(cssVars["--ev-hero-border-width"]).toBe("6px");
			expect(cssVars["--ev-bg-image"]).toBe("none");
		});
	});
});
