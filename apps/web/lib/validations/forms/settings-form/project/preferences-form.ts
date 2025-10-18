import { z } from "zod";

// Schema para branding (simplificado, pode precisar de validação de URL/File)
const brandingSchema = z.object({
	logoUrl: z
		.string()
		.url("URL do logo inválida")
		.optional()
		.or(z.literal("")),
	largeLogoUrl: z
		.string()
		.url("URL do logo horizontal inválida")
		.optional()
		.or(z.literal("")),
	bannerUrl: z
		.string()
		.url("URL do banner inválida")
		.optional()
		.or(z.literal("")),
	thumbnailUrl: z
		.string()
		.url("URL da miniatura inválida")
		.optional()
		.or(z.literal("")),
});

// Schema para cores (hexadecimal)
const colorSchema = z.object({
	primaryColor: z
		.string()
		.regex(/^#[0-9A-F]{6}$/i, "Cor primária inválida")
		.default("#000000")
		.nullable(),
	secondaryColor: z
		.string()
		.regex(/^#[0-9A-F]{6}$/i, "Cor secundária inválida")
		.default("#FFFFFF")
		.nullable(),
});

export { brandingSchema, colorSchema };
