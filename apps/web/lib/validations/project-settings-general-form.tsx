import { z } from "zod";

// Nome
const nameSchema = z.object({
	name: z.string().min(1, "Nome obrigatório").max(32, "Máximo 32 caracteres"),
});

// URL
const urlSchema = z.object({
	url: z.string().min(1, "URL obrigatória").max(36, "Máximo 36 caracteres"),
});

// Datas
const dateSchema = z.object({
	startDate: z.coerce.date({
		required_error: "Data inicial obrigatória",
	}),
	endDate: z.coerce.date({ required_error: "Data final obrigatória" }),
});

// Endereço
const addressSchema = z.object({
	address: z.string().min(1, "Endereço obrigatório"),
	latitude: z.coerce.number(),
	longitude: z.coerce.number(),
});

export { nameSchema, urlSchema, dateSchema, addressSchema };
