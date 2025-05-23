import { z } from "zod";

export const joinFormSection0Schema = z.object({
	email: z
		.string({ required_error: "Obrigatório" })
		.email({ message: "É necessário entrar com um e-mail institucional." }),
	/* .refine(
			(email) => {
				return email.endsWith("ic.ufal.br");
			},
			{
				message:
					"Eita! Parece que você não inseriu um e-mail institucional...\nPara ingressar no evento é necessário ser discente do IC.",
			},
		), */
});

export type JoinFormSection0Schema = z.infer<typeof joinFormSection0Schema>;
