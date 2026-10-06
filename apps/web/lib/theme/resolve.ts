import {
	parseEventTheme,
	type EffectColor,
	type EventTheme,
	type GradientStop,
	type HeroOverlayColor,
	type PageGradient,
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
	const ch = (hex: string, i: number) =>
		parseInt(hex.replace("#", "").slice(i, i + 2), 16);
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
	if (role === "background") return "var(--background)";
	return theme.primary;
}

/**
 * Aproximações hex de `var(--foreground)` por modo (só para o teste de
 * contraste server-side: o valor real continua sendo a variável CSS, que
 * resolve por modo sozinha). `oklch(0.3211 0 0)` ≈ `#333333`;
 * `oklch(0.9219 0 0)` ≈ `#E5E5E5`. As margens de AA aqui são folgadas
 * (reprova longe no claro, passa longe no escuro), então o arredondamento
 * não muda nenhuma decisão.
 */
const NEUTRAL_BG_LIGHT = "#333333";
const NEUTRAL_BG_DARK = "#E5E5E5";

/** Superfície de "conteúdo" (navegação ativa) para um papel e modo. */
function accentSurface(
	theme: EventTheme,
	role: EffectColor,
	onPrimary: string,
	onSecondary: string,
): { bg: string; fg: string } {
	// Neutro: fundo é o próprio token (resolve por modo) e o texto é o
	// inverso dele — o mesmo par do texto corrido, sempre AA.
	if (role === "foreground")
		return { bg: "var(--foreground)", fg: "var(--background)" };
	const hex = role === "secondary" ? theme.secondary : theme.primary;
	return { bg: hex, fg: role === "secondary" ? onSecondary : onPrimary };
}

/**
 * Texto dos selos da capa sobre fundo neutro: a cor primária quando ela
 * passa AA no neutro do modo (é o roxo sobre branco dos designs), senão a
 * cor de maior contraste derivada. Ícone herda a cor do texto.
 */
function neutralBadgeFg(theme: EventTheme, neutralBg: string): string {
	return contrastRatio(theme.primary, neutralBg) >= 4.5
		? theme.primary
		: bestOnColor(neutralBg);
}

/** Selos da capa: fundo do `content.accent` (+`accentDark` no escuro). */
function badgeSurface(
	theme: EventTheme,
	role: EffectColor,
	mode: "light" | "dark",
	onPrimary: string,
	onSecondary: string,
): { bg: string; fg: string } {
	if (role !== "foreground")
		return accentSurface(theme, role, onPrimary, onSecondary);
	const neutralBg = mode === "dark" ? NEUTRAL_BG_DARK : NEUTRAL_BG_LIGHT;
	return { bg: "var(--foreground)", fg: neutralBadgeFg(theme, neutralBg) };
}

/**
 * Parada de gradiente em CSS: a cor do papel com a própria opacidade,
 * interpolada contra transparente (`color-mix`) para o fade não puxar
 * franja cinza.
 */
function stopCss(theme: EventTheme, stop: GradientStop): string {
	return `color-mix(in srgb, ${roleColor(theme, stop.color)} ${Math.round(stop.opacity * 100)}%, transparent)`;
}

/** Gradiente linear entre as duas paradas (alfa já embutido em cada cor). */
function pageGradient(g: PageGradient, dir: string, theme: EventTheme): string {
	return `linear-gradient(${dir}, ${stopCss(theme, g.from)}, ${stopCss(theme, g.to)})`;
}

/**
 * Cores da capa: `dark` é um quase-preto neutro, sem papel de tema.
 * Exportado para o editor mostrar a mesma amostra que a página real aplica.
 */
export const HERO_NEUTRAL_TINT = "#141118";

/** Véu da capa em cima da cor escolhida, já escurecido para o texto branco. */
function heroTint(theme: EventTheme, color: HeroOverlayColor): string {
	if (color === "dark") return darkenUntilContrast(HERO_NEUTRAL_TINT);
	return darkenUntilContrast(
		color === "secondary" ? theme.secondary : theme.primary,
	);
}

export interface NavTokens {
	/** Cor base do texto da navegação. */
	fg: string;
	hoverBg: string;
	hoverFg: string;
	activeBg: string;
	activeFg: string;
	/** Ativo no modo escuro (`accentDark ?? accent`). */
	activeBgDark: string;
	activeFgDark: string;
	ctaBorder: string;
	ctaFg: string;
	ctaHoverBg: string;
	ctaHoverFg: string;
}

/**
 * Tokens da navegação do cabeçalho.
 *
 * O item ativo e os selos são "conteúdo": usam o `content.accent` do tema
 * (primária no claro dos designs, neutra no escuro via `accentDark`), com
 * texto sempre derivado por contraste. O CTA ("Inscrição") é contorno na
 * cor dos botões (`buttons.bg`) com texto na cor do cabeçalho.
 *
 * O hover é um véu da própria cor de texto (16%) em qualquer estilo de
 * cabeçalho: realce por cor oposta não funciona no gradiente (uma das
 * paradas é justamente essa cor) e o véu do texto nunca quebra AA.
 */
function navTokens(opts: {
	fg: string;
	activeBg: string;
	activeFg: string;
	activeBgDark: string;
	activeFgDark: string;
	ctaBorder: string;
	ctaFg: string;
	ctaHoverBg: string;
	ctaHoverFg: string;
}): NavTokens {
	const {
		fg,
		activeBg,
		activeFg,
		activeBgDark,
		activeFgDark,
		ctaBorder,
		ctaFg,
		ctaHoverBg,
		ctaHoverFg,
	} = opts;

	return {
		fg,
		hoverBg: translucent(fg, 0.16),
		hoverFg: fg,
		activeBg,
		activeFg,
		activeBgDark,
		activeFgDark,
		ctaBorder,
		ctaFg,
		ctaHoverBg,
		ctaHoverFg,
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
	const buttonFg = theme.buttons.bg === "primary" ? onPrimary : onSecondary;

	// `--accent`: superfícies/hover `ghost`/`outline` (`Button`, `Select`,
	// `DropdownMenu`…) seguem o `content.accent` do tema do evento. Neutro
	// usa o par invertido do texto corrido (sempre AA, nos dois modos).
	const accentBg = roleColor(theme, theme.content.accent);
	const accentFg =
		theme.content.accent === "foreground"
			? "var(--background)"
			: theme.content.accent === "primary"
				? onPrimary
				: onSecondary;

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
		loader =
			theme.header.bg === "secondary" ? theme.primary : theme.secondary;
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

	// Ativo = superfície de conteúdo (`content.accent`, com `accentDark` no
	// modo escuro); CTA = contorno na cor dos botões com texto na cor do
	// cabeçalho (no transparente, o token da página).
	const accentLight = accentSurface(
		theme,
		theme.content.accent,
		onPrimary,
		onSecondary,
	);
	const accentDark = accentSurface(
		theme,
		theme.content.accentDark ?? theme.content.accent,
		onPrimary,
		onSecondary,
	);
	const badgeLight = badgeSurface(
		theme,
		theme.content.accent,
		"light",
		onPrimary,
		onSecondary,
	);
	const badgeDark = badgeSurface(
		theme,
		theme.content.accentDark ?? theme.content.accent,
		"dark",
		onPrimary,
		onSecondary,
	);
	const nav = navTokens({
		fg: onHeader,
		activeBg: accentLight.bg,
		activeFg: accentLight.fg,
		activeBgDark: accentDark.bg,
		activeFgDark: accentDark.fg,
		ctaBorder: buttonBg,
		ctaFg: onHeader,
		ctaHoverBg: buttonBg,
		ctaHoverFg: buttonFg,
	});

	// Menu mobile: fundo opaco (o gradiente do cabeçalho esticado por
	// `h-screen` fica estranho) e texto com contraste sobre ele. No
	// cabeçalho transparente o menu não pode herdar o véu transparente —
	// cairia no fundo da página —, então usa o fundo da própria página.
	let mobileMenuBg = headerBg;
	let mobileMenuFg = onHeader;
	if (theme.header.style === "gradient") {
		const { secondary, primary } = theme;
		mobileMenuBg =
			contrastRatio(onHeader, secondary) >=
			contrastRatio(onHeader, primary)
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

	const gradient = (g: PageGradient | null, dir: string) =>
		g ? pageGradient(g, dir, theme) : "none";

	// Gradiente superior com `height: "hero"`: a capa o renderiza (cobre
	// cabeçalho + capa e termina no filete); aqui na página ele some.
	const topIsHero = theme.page.topGradient?.height === "hero";

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
		"--ev-nav-active-bg-dark": nav.activeBgDark,
		"--ev-nav-active-fg-dark": nav.activeFgDark,
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
		"--ev-content-accent-dark": roleColor(
			theme,
			theme.content.accentDark ?? theme.content.accent,
		),
		"--ev-badge-bg": badgeLight.bg,
		"--ev-badge-fg": badgeLight.fg,
		"--ev-badge-bg-dark": badgeDark.bg,
		"--ev-badge-fg-dark": badgeDark.fg,
		"--ev-hero-fg": theme.hero.image ? "#FFFFFF" : "var(--foreground)",
		"--ev-hero-fg-soft": theme.hero.image
			? "rgb(255 255 255 / 0.9)"
			: "var(--foreground)",
		"--ev-hero-border": theme.hero.border
			? roleColor(theme, theme.hero.border.color)
			: "transparent",
		"--ev-hero-border-width": theme.hero.border
			? `${theme.hero.border.width}px`
			: "0px",
		"--ev-hero-bg":
			theme.page.topGradient && topIsHero
				? pageGradient(theme.page.topGradient, "180deg", theme)
				: "none",
		"--ev-skeleton-bg": skeletonBg,
		"--ev-hero-tint": heroTint(theme, theme.hero.overlayColor),
		"--ev-hero-overlay-opacity": String(theme.hero.overlayOpacity),
		"--ev-card-radius": `${theme.card.radius}px`,
		"--ev-font-heading": FONT_FAMILIES[theme.fonts.heading]!,
		"--ev-font-body": FONT_FAMILIES[theme.fonts.body]!,
		"--ev-bg-image": bgImage,
		"--ev-bg-size": `${theme.page.effectSize}px ${theme.page.effectSize}px`,
		"--ev-bg-opacity": String(theme.page.effectOpacity),
		"--ev-top-gradient":
			theme.page.topGradient && !topIsHero
				? gradient(theme.page.topGradient, "180deg")
				: "none",
		"--ev-top-height":
			theme.page.topGradient &&
			typeof theme.page.topGradient.height === "number"
				? `${theme.page.topGradient.height}px`
				: "0px",
		"--ev-bottom-gradient":
			theme.page.bottomGradient &&
			typeof theme.page.bottomGradient.height === "number"
				? gradient(theme.page.bottomGradient, "0deg")
				: "none",
		"--ev-bottom-height":
			theme.page.bottomGradient &&
			typeof theme.page.bottomGradient.height === "number"
				? `${theme.page.bottomGradient.height}px`
				: "0px",
	};

	return { theme, onPrimary, onSecondary, cssVars };
}
