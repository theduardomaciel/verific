import { z } from "zod";
import { activityAudiences } from "@verific/drizzle/enum/audience";
import { activityCategories } from "@verific/drizzle/enum/category";

export const mutateActivityFormSchema = z.object({
	name: z.string({ required_error: "O nome da atividade é obrigatório" }),
	description: z.string().optional(),
	participantsLimit: z.coerce
		.number()
		.optional()
		.refine((val) => val && val > 0, {
			message: "O limite de participantes deve ser maior que 0",
		})
		.refine((val) => val && val <= 100, {
			message: "O limite de participantes deve ser menor que 100",
		}),
	tolerance: z.coerce
		.number()
		.optional()
		.refine((val) => val && val >= 0, {
			message: "A tolerância deve ser maior ou igual a 0",
		}),
	workload: z.coerce
		.number()
		.optional()
		.refine((val) => val && val >= 0, {
			message: "A carga horária deve ser maior ou igual a 0",
		})
		.refine((val) => val && val <= 100, {
			message: "A carga horária deve ser menor ou igual a 100",
		}),
	audience: z.enum(activityAudiences).default("internal").optional(),
	participantIds: z.array(z.string()).default([]).optional(),
	dateFrom: z.coerce.date({
		required_error: "É necessário inserir a data de início do evento",
	}),
	/* dateTo: z.coerce.date() */
	timeFrom: z.string({
		required_error: "É necessário inserir o horário de início do evento",
	}),
	timeTo: z.string({
		required_error: "É necessário inserir o horário de término do evento",
	}),
	category: z.enum(activityCategories, {
		required_error:
			"É necessário informar qual a ACE cumprida pelo evento.",
	}),
});

export type MutateActivityFormSchema = z.infer<typeof mutateActivityFormSchema>;
