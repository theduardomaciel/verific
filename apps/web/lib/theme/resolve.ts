import {
	parseEventTheme,
	type EventTheme,
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

	let headerBg = "transparent";
	if (theme.header.style === "solid") {
		headerBg = roleColor(theme, theme.header.bg);
	} else if (theme.header.style === "gradient") {
		headerBg = `linear-gradient(120deg, ${theme.secondary}, ${theme.primary})`;
	}

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
		"--ring": theme.primary,
		"--ev-header-bg": headerBg,
		"--ev-footer-bg": roleColor(theme, theme.footer.bg),
		"--ev-button-bg": buttonBg,
		"--ev-button-fg": buttonFg,
		"--ev-content-accent": roleColor(theme, theme.content.accent),
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
