import { z } from "zod";
import { activityAudiences } from "@verific/drizzle/enum/audience";
import { activityCategories } from "@verific/drizzle/enum/category";

export const mutateActivityFormSchema = z.object({
	name: z
		.string({ required_error: "O nome da atividade é obrigatório" })
		.min(3, {
			message: "O nome da atividade deve ter pelo menos 3 caracteres",
		}),
	description: z.string().optional(),
	participantsLimit: z.coerce
		.number()
		.optional()
		.refine((val) => val === undefined || (val >= 0 && val <= 100), {
			message: "O limite de participantes deve ser entre 0 e 100",
		}),
	tolerance: z.coerce
		.number()
		.optional()
		.refine((val) => val === undefined || val >= 0, {
			message: "A tolerância deve ser maior ou igual a 0",
		}),
	workload: z.coerce
		.number()
		.optional()
		.refine((val) => val === undefined || (val >= 0 && val <= 100), {
			message: "A carga horária deve ser entre 0 e 100",
		}),
	audience: z.enum(activityAudiences).default("internal").optional(),
	speakerId: z.string({
		required_error: "É necessário informar o palestrante da atividade",
	}),
	dateFrom: z.coerce.date({
		required_error: "É necessário inserir a data de início da atividade",
	}),
	/* dateTo: z.coerce.date() */
	timeFrom: z.string({
		required_error: "É necessário inserir o horário de início da atividade",
	}),
	timeTo: z.string({
		required_error:
			"É necessário inserir o horário de término da atividade",
	}),
	category: z.enum(activityCategories, {
		required_error: "É necessário informar qual a categoria da atividade.",
	}),
	address: z.string().optional(),
});

export type MutateActivityFormSchema = z.infer<typeof mutateActivityFormSchema>;
