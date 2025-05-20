import { z } from "zod";
import { courses } from "@verific/drizzle/enum/course";
import { periods } from "@verific/drizzle/enum/period";

export const joinFormSection1Schema = z.object({
	name: z
		.string({ required_error: "Obrigatório" })
		.min(2, {
			message: "Um nome deve conter no mínimo 2 caracteres.",
		})
		.refine((value) => value.split(" ").length >= 2, {
			message: "Um nome completo deve conter pelo menos um sobrenome.",
		})
		.transform((value) => {
			return value
				.split(" ")
				.map((word) => {
					return word.charAt(0).toUpperCase() + word.slice(1);
				})
				.join(" ");
		}),
	course: z.enum(courses, { required_error: "Selecione uma opção" }),
	registrationId: z
		.string({ required_error: "Obrigatório" })
		.min(7, {
			message: "O número de matrícula é inválido.",
		})
		.max(9, { message: "O número de matrícula é inválido" }),
	period: z.enum(periods, {
		required_error: "Selecione uma opção",
	}),
	phoneNumber: z
		.string({ required_error: "Obrigatório" })
		.regex(/^\(\d{2}\) \d{5}-\d{4}$/, {
			message:
				"O número de telefone deve estar no formato (XX) XXXXX-XXXX",
		}),
});

export type JoinFormSection1Schema = z.infer<typeof joinFormSection1Schema>;
