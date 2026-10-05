import { z } from "@verific/zod";

/**
 * Tema por evento (JSON versionado em `projects.theme`).
 *
 * Eventos seguem a preferência de cor do visitante (`next-themes`), então
 * não existe um par light/dark de cores: o mesmo primary/secondary vale
 * para os dois modos e variantes seriam dados mortos. Cores de texto sobre
 * as cores do tema (`onPrimary`/`onSecondary`, tokens da navegação, etc.)
 * nunca são armazenadas: são derivadas server-side por contraste WCAG AA.
 *
 * O texto da capa é sempre branco (o fundo é uma imagem, não uma cor de
 * tema); o que o organizador escolhe é a cor do véu sobre a capa
 * (`hero.overlayColor`), escurecida automaticamente até ficar legível.
 */
export const THEME_VERSION = 1 as const;

const hexColor = z
	.string()
	.regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida (use o formato #RRGGBB)");

export const fontPresetSchema = z.enum([
	"hanken-grotesk",
	"rem",
	"inter",
	"sora",
	"space-grotesk",
]);
export type FontPreset = z.infer<typeof fontPresetSchema>;

export const themeRoleSchema = z.enum(["primary", "secondary"]);
export type ThemeRole = z.infer<typeof themeRoleSchema>;

/** Origens de cor para paradas de gradiente (permite fade p/ transparente). */
export const gradientStopSchema = z.enum(["primary", "secondary", "transparent"]);
export type GradientStop = z.infer<typeof gradientStopSchema>;

/** Origens de cor para efeitos de fundo (inclui neutro do tema). */
export const effectColorSchema = z.enum(["primary", "secondary", "foreground"]);
export type EffectColor = z.infer<typeof effectColorSchema>;

/**
 * Cor dos esqueletos de carregamento. `muted` preserva o cinza global
 * (igual ao dashboard); `primary`/`secondary` usam as cores do evento.
 */
export const skeletonBgSchema = z.enum(["primary", "secondary", "muted"]);
export type SkeletonBg = z.infer<typeof skeletonBgSchema>;

/**
 * Cor do véu sobre a capa do evento. O texto da capa é sempre branco, então
 * qualquer cor escolhida é escurecida até atingir AA contra o branco
 * (`darkenUntilContrast` em `resolve.ts`); `dark` é um quase-preto neutro.
 */
export const heroOverlayColorSchema = z.enum(["primary", "secondary", "dark"]);
export type HeroOverlayColor = z.infer<typeof heroOverlayColorSchema>;

const gradientEndSchema = z.object({
	height: z.number().int().min(0).max(600).default(240),
	from: gradientStopSchema.default("primary"),
	to: gradientStopSchema.default("secondary"),
	opacity: z.number().min(0).max(1).default(0.35),
});

export const eventThemeSchema = z.object({
	version: z.literal(THEME_VERSION).default(THEME_VERSION),
	primary: hexColor.default("#6D28D9"),
	secondary: hexColor.default("#14B8A6"),
	fonts: z
		.object({
			heading: fontPresetSchema.default("rem"),
			body: fontPresetSchema.default("hanken-grotesk"),
		})
		.default({ heading: "rem", body: "hanken-grotesk" }),
	header: z
		.object({
			bg: themeRoleSchema.default("primary"),
			style: z.enum(["solid", "gradient", "transparent"]).default("solid"),
		})
		.default({ bg: "primary", style: "solid" }),
	footer: z
		.object({
			bg: themeRoleSchema.default("primary"),
		})
		.default({ bg: "primary" }),
	buttons: z
		.object({
			bg: themeRoleSchema.default("secondary"),
		})
		.default({ bg: "secondary" }),
	content: z
		.object({
			accent: themeRoleSchema.default("primary"),
			skeleton: skeletonBgSchema.default("muted"),
		})
		.default({ accent: "primary", skeleton: "muted" }),
	hero: z
		.object({
			overlayColor: heroOverlayColorSchema.default("primary"),
			overlayOpacity: z.number().min(0).max(0.85).default(0.45),
		})
		.default({ overlayColor: "primary", overlayOpacity: 0.45 }),
	page: z
		.object({
			effect: z.enum(["none", "grid", "dots", "solid"]).default("none"),
			effectSize: z.number().int().min(8).max(96).default(32),
			effectOpacity: z.number().min(0).max(0.5).default(0.12),
			effectColor: effectColorSchema.default("primary"),
			topGradient: gradientEndSchema.nullable().default(null),
			bottomGradient: gradientEndSchema.nullable().default(null),
		})
		.default({
			effect: "none",
			effectSize: 32,
			effectOpacity: 0.12,
			effectColor: "primary",
			topGradient: null,
			bottomGradient: null,
		}),
	card: z
		.object({
			radius: z.union([z.literal(16), z.literal(20), z.literal(24)]).default(24),
		})
		.default({ radius: 24 }),
});

export type EventTheme = z.infer<typeof eventThemeSchema>;

export const DEFAULT_THEME: EventTheme = eventThemeSchema.parse({});

/** Mescla o tema armazenado sobre os padrões (com fallback das cores legadas). */
export function parseEventTheme(input: {
	theme?: unknown;
	primaryColor?: string | null;
	secondaryColor?: string | null;
}): EventTheme {
	const parsed = eventThemeSchema.safeParse(input.theme ?? {});
	const base = parsed.success ? parsed.data : DEFAULT_THEME;
	const hex = (v: string | null | undefined) =>
		v && /^#[0-9A-Fa-f]{6}$/.test(v) ? v : undefined;
	return {
		...base,
		primary: hex(input.primaryColor) ?? base.primary,
		secondary: hex(input.secondaryColor) ?? base.secondary,
	};
}
