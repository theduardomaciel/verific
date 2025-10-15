import { z } from "zod";

export const joinFormSection2Schema = z.object({
	reason: z
		.string()
		.max(250, { message: "Desculpe, o limite de caracteres é 250 :(" })
		.optional(),
	accessibility: z
		.string()
		.max(1000, { message: "Desculpe, o limite de caracteres é 1000 :(" })
		.optional(),
	discovery: z.enum([
		"instagram",
		"facebook",
		"twitter",
		"tiktok",
		"linkedin",
		"friends",
		"family",
		"event",
		"online_ad",
		"search_engine",
		"other"
	]).optional(),
	discoveryOther: z.string().max(50).optional(),
});

export type JoinFormSection2Schema = z.infer<typeof joinFormSection2Schema>;
