import { z } from "zod";

export const joinFormSection2Schema = z.object({
	reason: z
		.string()
		.max(250, { message: "Desculpe, o limite de caracteres é 250 :(" })
		.optional(),
	discovery: z.enum(["social_media", "friends", "other"]).optional(),
	discoveryOther: z.string().max(50).optional(),
});

export type JoinFormSection2Schema = z.infer<typeof joinFormSection2Schema>;
