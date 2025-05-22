import { z } from "zod";

// Schema para gerenciamento de inscrições
const subscriptionManagementSchema = z.object({
	enableSubscription: z.boolean().default(true),
});

// Schema para descrição do evento
const eventDescriptionSchema = z.object({
	description: z
		.string()
		.min(1, "Descrição obrigatória")
		.max(3000, "Máximo 3000 caracteres")
		.default("Insira sua descrição aqui"),
});

// Schema para branding (simplificado, pode precisar de validação de URL/File)
const brandingSchema = z.object({
	logoUrl: z
		.string()
		.url("URL do logo inválida")
		.optional()
		.or(z.literal("")),
	bannerUrl: z
		.string()
		.url("URL do banner inválida")
		.optional()
		.or(z.literal("")),
});

// Schema para cores (hexadecimal)
const colorSchema = z.object({
	primaryColor: z
		.string()
		.regex(/^#[0-9A-F]{6}$/i, "Cor primária inválida")
		.default("#000000"),
	secondaryColor: z
		.string()
		.regex(/^#[0-9A-F]{6}$/i, "Cor secundária inválida")
		.default("#FFFFFF"),
});

export {
	subscriptionManagementSchema,
	eventDescriptionSchema,
	brandingSchema,
	colorSchema,
};
