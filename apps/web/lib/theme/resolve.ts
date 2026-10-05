import {
	parseEventTheme,
	type EventTheme,
	type HeroOverlayColor,
} from "@verific/drizzle/theme";

import { FONT_FAMILIES } from "./presets";

function luminance(hex: string): number {
	const c = hex.replace("#", "");
	const rgb = [0, 2, 4].map((i) => {
		const v = parseInt(c.slice(i, i + 2), 16) / 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
}

/** Razão de contraste WCAG entre duas cores hex. */
export function contrastRatio(a: string, b: string): number {
	const sorted = [luminance(a), luminance(b)].sort((x, y) => y - x);
	const l1 = sorted[0] ?? 0;
	const l2 = sorted[1] ?? 0;
	return (l1 + 0.05) / (l2 + 0.05);
}

const LIGHT_TEXT = "#FFFFFF";
const DARK_TEXT = "#141118";

/**
 * Interpola duas cores hex em sRGB: `t = 0` devolve `a`, `t = 1` devolve `b`.
 * Equivale ao `color-mix(in srgb, a X%, b)` do CSS (mistura com alfa
 * pré-multiplicado), o que permite prever no servidor a cor final de uma
 * camada translúcida sobre um fundo opaco.
 */
export function mixHex(a: string, b: string, t: number): string {
	const ch = (hex: string, i: number) => parseInt(hex.replace("#", "").slice(i, i + 2), 16);
	const to = (v: number) =>
		Math.round(Math.min(255, Math.max(0, v)))
			.toString(16)
			.padStart(2, "0")
			.toUpperCase();
	const mix = `${to(ch(a, 0) + (ch(b, 0) - ch(a, 0)) * t)}${to(ch(a, 2) + (ch(b, 2) - ch(a, 2)) * t)}${to(ch(a, 4) + (ch(b, 4) - ch(a, 4)) * t)}`;
	return `#${mix}`;
}

/** `color-mix(in srgb, <cor> <t*100>%, transparent)`: véu translúcido. */
function translucent(hex: string, t: number): string {
	return `color-mix(in srgb, ${hex} ${Math.round(t * 100)}%, transparent)`;
}

/**
 * Escurece a cor (misturando com preto) em passos pequenos até atingir o
 * contraste alvo contra `against`. É o que garante texto branco legível
 * sobre qualquer cor que o organizador escolher para a capa.
 */
export function darkenUntilContrast(
	hex: string,
	against: string = LIGHT_TEXT,
	target: number = 4.5,
): string {
	if (contrastRatio(against, hex) >= target) return hex;
	let out = hex;
	for (let i = 0; i < 50; i++) {
		out = mixHex(out, "#000000", 0.05);
		if (contrastRatio(against, out) >= target) break;
	}
	return out;
}

/**
 * Cor de texto sobre o fundo, auto-derivada com alvo WCAG AA (4.5).
 * Retorna a opção com maior contraste quando nenhuma atinge AA.
 */
export function bestOnColor(bg: string): string {
	const light = contrastRatio(LIGHT_TEXT, bg);
	const dark = contrastRatio(DARK_TEXT, bg);
	if (light >= 4.5 && light >= dark) return LIGHT_TEXT;
	if (dark >= 4.5 && dark > light) return DARK_TEXT;
	return light >= dark ? LIGHT_TEXT : DARK_TEXT;
}

/**
 * Igual a `bestOnColor`, mas para fundos com mais de uma cor (o gradiente
 * do cabeçalho): escolhe a opção com maior contraste *mínimo* entre todas
 * as paradas, para nenhum trecho do fundo ficar ilegível.
 */
export function bestOnColors(bgs: string[]): string {
	const worst = (fg: string) =>
		bgs.reduce((min, bg) => Math.min(min, contrastRatio(fg, bg)), Infinity);
	const light = worst(LIGHT_TEXT);
	const dark = worst(DARK_TEXT);
	if (light >= 4.5 && light >= dark) return LIGHT_TEXT;
	if (dark >= 4.5 && dark > light) return DARK_TEXT;
	return light >= dark ? LIGHT_TEXT : DARK_TEXT;
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/**
 * Versão suave de um texto derivado (`header-fg-soft`/`footer-fg-soft`):
 * maior opacidade que ainda passa AA contra o fundo, misturada com o
 * próprio fundo. Nunca devolve um tom que reprova o gate de contraste.
 * Fundos não-hexadecimais (`transparent`, `var(--background)`) dependem do
 * modo do visitante: nesses casos devolve o texto cheio, que já é AA.
 */
function softOnColor(fg: string, bg: string, target: number = 4.5): string {
	if (!HEX_RE.test(fg) || !HEX_RE.test(bg)) return fg;
	for (let step = 100; step >= 30; step -= 1) {
		const alpha = step / 100;
		if (contrastRatio(mixHex(bg, fg, alpha), bg) >= target) {
			return `color-mix(in srgb, ${fg} ${step}%, ${bg})`;
		}
	}
	return fg;
}

export interface ResolvedEventTheme {
	theme: EventTheme;
	onPrimary: string;
	onSecondary: string;
	cssVars: Record<string, string>;
}

function roleColor(theme: EventTheme, role: string): string {
	if (role === "secondary") return theme.secondary;
	if (role === "transparent") return "transparent";
	if (role === "foreground") return "var(--foreground)";
	return theme.primary;
}

/**
 * Cores da capa: `dark` é um quase-preto neutro, sem papel de tema.
 * Exportado para o editor mostrar a mesma amostra que a página real aplica.
 */
export const HERO_NEUTRAL_TINT = "#141118";

/** Véu da capa em cima da cor escolhida, já escurecido para o texto branco. */
function heroTint(theme: EventTheme, color: HeroOverlayColor): string {
	if (color === "dark") return darkenUntilContrast(HERO_NEUTRAL_TINT);
	return darkenUntilContrast(color === "secondary" ? theme.secondary : theme.primary);
}

export interface NavTokens {
	/** Cor base do texto da navegação. */
	fg: string;
	hoverBg: string;
	hoverFg: string;
	activeBg: string;
	activeFg: string;
	ctaBorder: string;
	ctaFg: string;
	ctaHoverBg: string;
	ctaHoverFg: string;
}

/**
 * Tokens da navegação do cabeçalho.
 *
 * Cabeçalho sólido: o realce é a cor **oposta** (primário → secundária e
 * vice-versa) — hoje o item ativo usava a própria cor do cabeçalho e
 * virava invisível. O véu do hover é essa mesma cor a 40% de alfa sobre o
 * cabeçalho, então o texto sobre ele continua passando AA.
 *
 * Gradiente/transparente: realce por cor oposta não funciona (uma das
 * paradas do gradiente é justamente essa cor), então hover/ativo são
 * véus translúcidos da própria cor de texto (16% / 26%) e o CTA ganha
 * borda na cor de texto a 60%.
 */
function navTokens(opts: {
	fg: string;
	/** Cor sólida oposta ao cabeçalho, quando existe (estilo sólido). */
	highlight?: string;
	/** Fundo opaco do cabeçalho (para prever a cor do véu do hover). */
	bg?: string;
}): NavTokens {
	const { fg, highlight, bg } = opts;

	if (highlight) {
		const hoverSolid = bg ? mixHex(bg, highlight, 0.4) : highlight;
		return {
			fg,
			hoverBg: translucent(highlight, 0.4),
			hoverFg: bestOnColor(hoverSolid),
			activeBg: highlight,
			activeFg: bestOnColor(highlight),
			ctaBorder: translucent(highlight, 0.6),
			ctaFg: fg,
			ctaHoverBg: highlight,
			ctaHoverFg: bestOnColor(highlight),
		};
	}

	return {
		fg,
		hoverBg: translucent(fg, 0.16),
		hoverFg: fg,
		activeBg: translucent(fg, 0.26),
		activeFg: fg,
		ctaBorder: translucent(fg, 0.6),
		ctaFg: fg,
		ctaHoverBg: translucent(fg, 0.16),
		ctaHoverFg: fg,
	};
}

/**
 * Resolve o tema efetivo do evento server-side (primeiro paint já temado,
 * sem cálculo no cliente): mescla padrões + cores legadas, deriva
 * `onPrimary`/`onSecondary` e emite variáveis CSS semânticas.
 */
export function resolveEventTheme(input: {
	theme?: unknown;
	primaryColor?: string | null;
	secondaryColor?: string | null;
}): ResolvedEventTheme {
	const theme = parseEventTheme(input);
	const onPrimary = bestOnColor(theme.primary);
	const onSecondary = bestOnColor(theme.secondary);

	const buttonBg = roleColor(theme, theme.buttons.bg);
	const buttonFg =
		theme.buttons.bg === "primary" ? onPrimary : onSecondary;

	// `--accent`: superfícies/hover `ghost`/`outline` (`Button`, `Select`,
	// `DropdownMenu`…) seguem o `content.accent` do tema do evento.
	const accentBg = roleColor(theme, theme.content.accent);
	const accentFg =
		theme.content.accent === "primary" ? onPrimary : onSecondary;

	// Esqueletos de carregamento: `muted` usa a cor de borda global
	// (cinza visível sobre o fundo nos dois modos: `gray-200` no claro,
	// `neutral-700` no escuro). `--muted` não serve: no escuro é quase
	// igual ao fundo e o `animate-pulse` apaga o resto do contraste.
	const skeletonBg =
		theme.content.skeleton === "muted"
			? "var(--border)"
			: roleColor(theme, theme.content.skeleton);

	// Barra do `NextTopLoader`: cor oposta ao cabeçalho (cabeçalho primário
	// → barra secundária). Gradiente usa ambas → secundária; transparente
	// mostra o fundo da página → primária.
	let loader: string;
	if (theme.header.style === "gradient") {
		loader = theme.secondary;
	} else if (theme.header.style === "transparent") {
		loader = theme.primary;
	} else {
		loader = theme.header.bg === "secondary" ? theme.primary : theme.secondary;
	}

	let headerBg = "transparent";
	if (theme.header.style === "solid") {
		headerBg = roleColor(theme, theme.header.bg);
	} else if (theme.header.style === "gradient") {
		headerBg = `linear-gradient(120deg, ${theme.secondary}, ${theme.primary})`;
	}

	const footerBg = roleColor(theme, theme.footer.bg);
	const footerFg = theme.footer.bg === "primary" ? onPrimary : onSecondary;

	// Texto sobre cabeçalho/rodapé: contraste derivado do papel de fundo
	// (nunca branco chapado — quebra com cores claras customizadas).
	// - sólido: o texto do próprio papel (`onPrimary`/`onSecondary`);
	// - gradiente: a opção com melhor contraste *mínimo* entre as paradas;
	// - transparente: o cabeçalho fica no fluxo, sobre o fundo da página, e
	//   herda o texto padrão (cliente segue `next-themes`).
	let onHeader: string;
	if (theme.header.style === "solid") {
		onHeader = theme.header.bg === "secondary" ? onSecondary : onPrimary;
	} else if (theme.header.style === "gradient") {
		onHeader = bestOnColors([theme.secondary, theme.primary]);
	} else {
		onHeader = "var(--foreground)";
	}

	const headerSolidBg =
		theme.header.style === "solid" ? roleColor(theme, theme.header.bg) : undefined;
	// Realce = papel oposto ao do cabeçalho sólido. Só existe quando as duas
	// cores são de fato distintas (primária == secundária não tem "oposto").
	const opposite =
		headerSolidBg === theme.primary && theme.primary !== theme.secondary
			? theme.secondary
			: headerSolidBg === theme.secondary && theme.primary !== theme.secondary
				? theme.primary
				: undefined;
	const nav = navTokens({ fg: onHeader, highlight: opposite, bg: headerSolidBg });

	// Menu mobile: fundo opaco (o gradiente do cabeçalho esticado por
	// `h-screen` fica estranho) e texto com contraste sobre ele. No
	// cabeçalho transparente o menu não pode herdar o véu transparente —
	// cairia no fundo da página —, então usa o fundo da própria página.
	let mobileMenuBg = headerBg;
	let mobileMenuFg = onHeader;
	if (theme.header.style === "gradient") {
		const { secondary, primary } = theme;
		mobileMenuBg =
			contrastRatio(onHeader, secondary) >= contrastRatio(onHeader, primary)
				? secondary
				: primary;
	} else if (theme.header.style === "transparent") {
		mobileMenuBg = "var(--background)";
		mobileMenuFg = "var(--foreground)";
	}

	// Mesma família tonal do `onHeader`/`onFooter`, com a maior opacidade
	// que ainda passa AA (datas, descrições, copyright). O header usa a cor
	// sólida que representa seu fundo (parada de gradiente mais legível).
	const headerFgSoft = softOnColor(onHeader, mobileMenuBg);
	const footerFgSoft = softOnColor(footerFg, footerBg);

	const { effect } = theme.page;
	const effectLine = roleColor(theme, theme.page.effectColor);
	let bgImage = "none";
	if (effect === "grid") {
		bgImage = `linear-gradient(${effectLine} 1px, transparent 1px), linear-gradient(90deg, ${effectLine} 1px, transparent 1px)`;
	} else if (effect === "dots") {
		bgImage = `radial-gradient(${effectLine} 1px, transparent 1px)`;
	} else if (effect === "solid") {
		bgImage = `linear-gradient(${effectLine}, ${effectLine})`;
	}

	const gradient = (
		g: {
			height: number;
			from: string;
			to: string;
			opacity: number;
		} | null,
		dir: string,
	) =>
		g
			? `linear-gradient(${dir}, ${roleColor(theme, g.from)}, ${roleColor(theme, g.to)})`
			: "none";

	const cssVars: Record<string, string> = {
		"--primary": theme.primary,
		"--secondary": theme.secondary,
		"--primary-foreground": onPrimary,
		"--secondary-foreground": onSecondary,
		"--accent": accentBg,
		"--accent-foreground": accentFg,
		"--ring": theme.primary,
		"--ev-loader": loader,
		"--ev-header-bg": headerBg,
		"--ev-header-fg": onHeader,
		"--ev-header-fg-soft": headerFgSoft,
		"--ev-nav-fg": nav.fg,
		"--ev-nav-hover-bg": nav.hoverBg,
		"--ev-nav-hover-fg": nav.hoverFg,
		"--ev-nav-active-bg": nav.activeBg,
		"--ev-nav-active-fg": nav.activeFg,
		"--ev-cta-border": nav.ctaBorder,
		"--ev-cta-fg": nav.ctaFg,
		"--ev-cta-hover-bg": nav.ctaHoverBg,
		"--ev-cta-hover-fg": nav.ctaHoverFg,
		"--ev-mobile-menu-bg": mobileMenuBg,
		"--ev-mobile-menu-fg": mobileMenuFg,
		"--ev-footer-bg": footerBg,
		"--ev-footer-fg": footerFg,
		"--ev-footer-fg-soft": footerFgSoft,
		"--ev-button-bg": buttonBg,
		"--ev-button-fg": buttonFg,
		"--ev-content-accent": roleColor(theme, theme.content.accent),
		"--ev-skeleton-bg": skeletonBg,
		"--ev-hero-tint": heroTint(theme, theme.hero.overlayColor),
		"--ev-hero-overlay-opacity": String(theme.hero.overlayOpacity),
		"--ev-card-radius": `${theme.card.radius}px`,
		"--ev-font-heading": FONT_FAMILIES[theme.fonts.heading]!,
		"--ev-font-body": FONT_FAMILIES[theme.fonts.body]!,
		"--ev-bg-image": bgImage,
		"--ev-bg-size": `${theme.page.effectSize}px ${theme.page.effectSize}px`,
		"--ev-bg-opacity": String(theme.page.effectOpacity),
		"--ev-top-gradient": gradient(theme.page.topGradient, "180deg"),
		"--ev-top-height": `${theme.page.topGradient?.height ?? 0}px`,
		"--ev-top-opacity": String(theme.page.topGradient?.opacity ?? 0),
		"--ev-bottom-gradient": gradient(theme.page.bottomGradient, "0deg"),
		"--ev-bottom-height": `${theme.page.bottomGradient?.height ?? 0}px`,
		"--ev-bottom-opacity": String(theme.page.bottomGradient?.opacity ?? 0),
	};

	return { theme, onPrimary, onSecondary, cssVars };
}
