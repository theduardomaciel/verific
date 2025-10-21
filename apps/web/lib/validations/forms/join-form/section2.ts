import { z } from "@verific/zod"
import { discoveryOptions } from "@verific/drizzle/enum/discovery";

export const joinFormSection2Schema = z.object({
	reason: z
		.string()
		.max(250, { message: "Desculpe, o limite de caracteres é 250 :(" })
		.optional(),
	accessibility: z
		.string()
		.max(1000, { message: "Desculpe, o limite de caracteres é 1000 :(" })
		.optional(),
	discovery: z.enum(discoveryOptions).optional(),
	discoveryOther: z.string().max(50).optional(),
});

export type JoinFormSection2Schema = z.infer<typeof joinFormSection2Schema>;
