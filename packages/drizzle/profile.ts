import { z } from "@verific/zod";

/**
 * Perfil do participante por evento (tabela `profiles`).
 * Campos fixos do sistema — não são `form_fields` e não aparecem como
 * respostas; vivem em linha própria por participante com privacidade por campo.
 *
 * Client-safe: só zod aqui (sem `node:crypto`, sem `db`).
 */

export const socialNetworkSchema = z.enum([
	"github",
	"instagram",
	"linkedin",
	"x",
	"site",
]);
export type SocialNetwork = z.infer<typeof socialNetworkSchema>;

export const socialLinkSchema = z.object({
	network: socialNetworkSchema,
	url: z.url("URL inválida").max(300),
});
export type SocialLink = z.infer<typeof socialLinkSchema>;

export const avatarSourceSchema = z.enum(["google", "github", "initials"]);
export type AvatarSource = z.infer<typeof avatarSourceSchema>;

export const privacyValueSchema = z.enum(["public", "private"]);
export type PrivacyValue = z.infer<typeof privacyValueSchema>;

export const profilePrivacySchema = z.object({
	birthDate: privacyValueSchema.default("private"),
	email: privacyValueSchema.default("private"),
	github: privacyValueSchema.default("public"),
	instagram: privacyValueSchema.default("public"),
	city: privacyValueSchema.default("public"),
	institution: privacyValueSchema.default("public"),
});
export type ProfilePrivacy = z.infer<typeof profilePrivacySchema>;

export const DEFAULT_PRIVACY: ProfilePrivacy = {
	birthDate: "private",
	email: "private",
	github: "public",
	instagram: "public",
	city: "public",
	institution: "public",
};

export const profileInputSchema = z.object({
	roleTitle: z.string().max(120).nullish(),
	birthDate: z.coerce.date().nullish(),
	city: z.string().max(120).nullish(),
	institution: z.string().max(160).nullish(),
	bio: z.string().max(500).nullish(),
	socials: z.array(socialLinkSchema).max(8).default([]),
	publicEmail: z.email("E-mail inválido").max(160).nullish(),
	avatarSource: avatarSourceSchema.default("google"),
	avatarGithubHandle: z.string().max(80).nullish(),
	privacy: profilePrivacySchema.default(DEFAULT_PRIVACY),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

/** Rótulo pt-BR de cada conceito do perfil (builder + avisos). */
export const PROFILE_FIELD_LABELS = {
	roleTitle: "Cargo / curso",
	birthDate: "Data de nascimento",
	city: "Cidade",
	institution: "Instituição",
	bio: "Bio",
	socials: "Redes sociais",
	publicEmail: "E-mail público",
} as const;

/** Heurística de duplicados: campos do formulário que repetem o perfil. */
const DUPLICATE_KEYWORDS: Array<{
	field: keyof typeof PROFILE_FIELD_LABELS;
	keywords: string[];
}> = [
	{
		field: "roleTitle",
		keywords: ["cargo", "profiss", "curso", "ocupação", "ocupacao", "título", "titulo"],
	},
	{
		field: "birthDate",
		keywords: ["nascimento", "nascido", "idade", "aniversário", "aniversario"],
	},
	{
		field: "city",
		keywords: ["cidade", "município", "municipio", "localidade"],
	},
	{
		field: "institution",
		keywords: ["institui", "universidade", "faculdade", "escola", "empresa", "ufal", "organização", "organizacao"],
	},
	{ field: "bio", keywords: ["bio", "sobre você", "sobre voce", "apresentação", "apresentacao"] },
	{
		field: "socials",
		keywords: ["github", "instagram", "linkedin", "rede social", "redes sociais", "twitter", "site", "portfólio", "portfolio"],
	},
	{
		field: "publicEmail",
		keywords: ["e-mail", "email", "correio"],
	},
];

const norm = (s: string) =>
	s
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

/** Avio, não bloqueio: sugere remover campos que duplicam a seção de perfil. */
export function detectProfileDuplicates(
	fields: Array<{ id: string; label: string }>,
): Array<{ fieldId: string; label: string; profileField: string }> {
	const out: Array<{ fieldId: string; label: string; profileField: string }> = [];
	for (const f of fields) {
		const hay = norm(f.label);
		for (const { field, keywords } of DUPLICATE_KEYWORDS) {
			if (keywords.some((k) => hay.includes(norm(k)))) {
				out.push({
					fieldId: f.id,
					label: f.label,
					profileField: PROFILE_FIELD_LABELS[field],
				});
				break;
			}
		}
	}
	return out;
}

/** Formato do link do perfil (usado no aviso da inscrição + futuro e-mail). */
export function profilePath(eventUrl: string, shortId: string): string {
	return `/${eventUrl}/profile/${shortId}`;
}
