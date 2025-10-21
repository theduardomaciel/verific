import { z } from "@verific/zod"

// Nome
const nameSchema = z.object({
	name: z.string().min(1, "Nome obrigatório").max(32, "Máximo 32 caracteres"),
});

// URL
const urlSchema = z.object({
	url: z
		.string()
		.min(1, "URL obrigatória")
		.max(36, "Máximo 36 caracteres")
		.refine(
			(val) => {
				const regex = /^[a-zA-Z0-9-_]+$/;
				return regex.test(val);
			},
			{
				message:
					"A URL deve conter apenas letras, números, hífens e sublinhados",
			},
		),
});

// Schema para descrição do evento
const eventDescriptionSchema = z.object({
	description: z
		.string()
		.min(1, "Descrição obrigatória")
		.max(3000, "Máximo 3000 caracteres")
		.default("Insira sua descrição aqui"),
});

// Datas
const dateSchema = z.object({
	startDate: z.coerce.date({
		error: "Data inicial obrigatória",
	}),
	endDate: z.coerce.date({ error: "Data final obrigatória" }),
});

// Endereço
const addressSchema = z.object({
	address: z.string().min(1, "Endereço obrigatório"),
	latitude: z.coerce.number(),
	longitude: z.coerce.number(),
});

export {
	nameSchema,
	eventDescriptionSchema,
	urlSchema,
	dateSchema,
	addressSchema,
};
