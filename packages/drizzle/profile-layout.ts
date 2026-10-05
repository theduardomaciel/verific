import { z } from "@verific/zod";

/**
 * Layout do perfil por evento (JSON em `projects.profile_layout`).
 * Organizadores ligam campos do PRÓPRIO formulário a slots fixos;
 * o perfil renderiza só o que foi ligado, a partir das respostas.
 * Client-safe: só zod aqui (sem `node:crypto`, sem `db`).
 */

export const PROFILE_LAYOUT_VERSION = 1 as const;

/** Pool fechado de ícones p/ itens do cartão de stats (chaves lucide). */
export const STAT_ICON_KEYS = [
	"cake",
	"map-pin",
	"graduation-cap",
	"briefcase",
	"phone",
	"globe",
	"calendar",
	"star",
	"heart",
	"flag",
	"music",
	"book-open",
] as const;
export type StatIconKey = (typeof STAT_ICON_KEYS)[number];

export const STAT_ICON_LABELS: Record<StatIconKey, string> = {
	cake: "Aniversário",
	"map-pin": "Local",
	"graduation-cap": "Formação",
	briefcase: "Trabalho",
	phone: "Telefone",
	globe: "Site",
	calendar: "Data",
	star: "Destaque",
	heart: "Favorito",
	flag: "Meta",
	music: "Música",
	"book-open": "Leitura",
};

/** Serviços suportados pelo campo `social_links` (fonte única). */
export const SOCIAL_SERVICES = [
	{
		id: "github",
		label: "GitHub",
		hostnames: ["github.com"],
		handleBase: "https://github.com/",
		icon: "github",
	},
	{
		id: "instagram",
		label: "Instagram",
		hostnames: ["instagram.com"],
		handleBase: "https://instagram.com/",
		icon: "instagram",
	},
	{
		id: "linkedin",
		label: "LinkedIn",
		hostnames: ["linkedin.com"],
		handleBase: "https://linkedin.com/in/",
		icon: "linkedin",
	},
	{
		id: "x",
		label: "X (antigo Twitter)",
		hostnames: ["x.com", "twitter.com"],
		handleBase: "https://x.com/",
		icon: "x",
	},
	{
		id: "lattes",
		label: "Lattes",
		hostnames: ["lattes.cnpq.br"],
		handleBase: "http://lattes.cnpq.br/",
		icon: "lattes",
	},
	{
		id: "website",
		label: "Site",
		hostnames: [],
		handleBase: null,
		icon: "globe",
	},
] as const;

export type SocialServiceId = (typeof SOCIAL_SERVICES)[number]["id"];
export type SocialServiceIcon = (typeof SOCIAL_SERVICES)[number]["icon"];

export function socialServiceById(id: string) {
	return SOCIAL_SERVICES.find((s) => s.id === id);
}

function stripHandle(v: string): string {
	return v.trim().replace(/^@/, "");
}

/** Normaliza usuário ou URL p/ URL completa (ou null se vazio). */
export function normalizeSocialLink(
	serviceId: string,
	raw: string | null | undefined,
): string | null {
	const service = socialServiceById(serviceId);
	if (!service) return null;
	const v = stripHandle(raw ?? "");
	if (!v) return null;
	if (/^https?:\/\//i.test(v)) return v;
	if (v.includes(".") || v.includes("/")) {
		const scheme = service.handleBase?.startsWith("http://")
			? "http://"
			: "https://";
		return `${scheme}${v}`;
	}
	if (service.handleBase) return `${service.handleBase}${v}`;
	return null;
}

/** Texto exibido no chip (último segmento da URL ou valor cru). */
export function socialDisplayHandle(url: string): string {
	try {
		const parsed = new URL(url);
		const last = parsed.pathname.split("/").filter(Boolean).pop();
		if (last) return last;
		return parsed.hostname.replace(/^www\./, "");
	} catch {
		return url.split("/").pop()?.replace(/\?.*$/, "") ?? url;
	}
}

export const socialEntrySchema = z.object({
	service: z.enum(SOCIAL_SERVICES.map((s) => s.id) as [string, ...string[]]),
	value: z.string().min(1).max(300),
});
export type SocialEntry = z.infer<typeof socialEntrySchema>;

export const socialLinksSchema = z.array(socialEntrySchema).max(8);
export type SocialLinks = z.infer<typeof socialLinksSchema>;

/** Slots fixos do layout -> tipos de campo aceitos (fonte única p/ editor, validação e renderer). */
export const PROFILE_SLOTS = {
	subtitle: { accepts: ["text"] as const, max: 1 },
	bio: { accepts: ["textarea", "text"] as const, max: 1 },
	stats: {
		accepts: [
			"text",
			"number",
			"date",
			"email",
			"phone",
			"select_single",
			"radio_group",
		] as const,
		max: 5,
	},
	socials: { accepts: ["social_links"] as const, max: 1 },
	email: { accepts: ["email"] as const, max: 1 },
} as const;
export type ProfileSlotKey = keyof typeof PROFILE_SLOTS;

export const profileLayoutSchema = z.object({
	version: z.literal(PROFILE_LAYOUT_VERSION).default(PROFILE_LAYOUT_VERSION),
	subtitleFieldId: z.uuid().nullish(),
	bioFieldId: z.uuid().nullish(),
	stats: z
		.array(
			z.object({
				fieldId: z.uuid(),
				label: z.string().trim().max(60),
				icon: z.enum(STAT_ICON_KEYS),
			}),
		)
		.max(5)
		.default([]),
	socialsFieldId: z.uuid().nullish(),
	emailFieldId: z.uuid().nullish(),
	connectionsEnabled: z.boolean().default(true),
	badgesEnabled: z.boolean().default(false),
});
export type ProfileLayout = z.infer<typeof profileLayoutSchema>;

export const DEFAULT_PROFILE_LAYOUT: ProfileLayout = profileLayoutSchema.parse(
	{},
);

export function parseProfileLayout(input: unknown): ProfileLayout {
	const parsed = profileLayoutSchema.safeParse(input ?? {});
	return parsed.success ? parsed.data : DEFAULT_PROFILE_LAYOUT;
}

export function slotForField(
	layout: ProfileLayout,
	fieldId: string,
): { slot: ProfileSlotKey; statIndex: number | null } | null {
	if (layout.subtitleFieldId === fieldId)
		return { slot: "subtitle", statIndex: null };
	if (layout.bioFieldId === fieldId) return { slot: "bio", statIndex: null };
	if (layout.socialsFieldId === fieldId)
		return { slot: "socials", statIndex: null };
	if (layout.emailFieldId === fieldId)
		return { slot: "email", statIndex: null };
	const statIndex = layout.stats.findIndex((s) => s.fieldId === fieldId);
	if (statIndex >= 0) return { slot: "stats", statIndex };
	return null;
}

export function isCompatible(slot: ProfileSlotKey, type: string): boolean {
	return (PROFILE_SLOTS[slot].accepts as readonly string[]).includes(type);
}

export function isFieldLinked(
	layout: ProfileLayout | null | undefined,
	fieldId: string,
): boolean {
	return slotForField(layout ?? DEFAULT_PROFILE_LAYOUT, fieldId) !== null;
}

/**
 * Valor de resposta p/ exibição no perfil (pt-BR). Retorna null quando
 * vazio; nunca lança (renderer pula o slot em erro).
 */
export function formatProfileValue(
	value: unknown,
	type: string,
): string | null {
	try {
		if (value === null || value === undefined) return null;
		if (typeof value === "string") {
			const trimmed = value.trim();
			if (!trimmed) return null;
			if (type === "date") {
				const d = new Date(trimmed);
				if (!Number.isNaN(d.getTime())) {
					return d.toLocaleDateString("pt-BR", {
						day: "numeric",
						month: "long",
						year: "numeric",
					});
				}
			}
			return trimmed;
		}
		if (value instanceof Date) {
			if (Number.isNaN(value.getTime())) return null;
			return value.toLocaleDateString("pt-BR", {
				day: "numeric",
				month: "long",
				year: "numeric",
			});
		}
		if (typeof value === "number") return value.toLocaleString("pt-BR");
		if (typeof value === "boolean") return value ? "Sim" : "Não";
		if (Array.isArray(value)) {
			const parts = value
				.map((v) => formatProfileValue(v, "text"))
				.filter((v): v is string => v !== null);
			return parts.length > 0 ? parts.join("; ") : null;
		}
		return String(value);
	} catch {
		return null;
	}
}
