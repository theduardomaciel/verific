import { z } from "@verific/zod";
import { activityAudiences } from "@verific/drizzle/enum/audience";
import { activityCategories } from "@verific/drizzle/enum/category";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (time: string) => {
	const [h, m] = time.split(":").map(Number);
	return h! * 60 + m!;
};

export const activitySessionFormSchema = z.object({
	date: z.coerce.date({
		error: "É necessário inserir a data da sessão",
	}),
	timeFrom: z
		.string({
			error: "É necessário inserir o horário de início da sessão",
		})
		.regex(timeRegex, "Formato de horário inválido"),
	timeTo: z
		.string({
			error: "É necessário inserir o horário de término da sessão",
		})
		.regex(timeRegex, "Formato de horário inválido"),
	address: z.string().optional(),
});

export const mutateActivityFormSchema = z
	.object({
		name: z.string({ error: "O nome da atividade é obrigatório" }).min(3, {
			message: "O nome da atividade deve ter pelo menos 3 caracteres",
		}),
		description: z.string().optional(),
		isRegistrationOpen: z.boolean().optional(),
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
		speakerIds: z.array(z.number()).optional(),
		tagIds: z.array(z.uuid()).max(5).optional(),
		sessions: z
			.array(activitySessionFormSchema)
			.min(1, { message: "A atividade precisa de pelo menos uma sessão" })
			.max(30, { message: "Máximo de 30 sessões por atividade" }),
		category: z.enum(activityCategories, {
			error: "É necessário informar qual a categoria da atividade.",
		}),
		address: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		const intervals = [];

		for (let i = 0; i < (data.sessions ?? []).length; i++) {
			const session = data.sessions[i]!;
			if (session.timeFrom && session.timeTo) {
				if (toMinutes(session.timeTo) <= toMinutes(session.timeFrom)) {
					ctx.addIssue({
						code: "custom",
						message:
							"Horário de término deve ser após o horário de início",
						path: ["sessions", i, "timeTo"],
					});
					continue;
				}
				const startsAt = new Date(session.date);
				setTimeOnDate(startsAt, session.timeFrom);
				const endsAt = new Date(session.date);
				setTimeOnDate(endsAt, session.timeTo);
				intervals.push({ startsAt, endsAt });
			}
		}

		const sorted = [...intervals].sort(
			(a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
		);
		for (let i = 1; i < sorted.length; i++) {
			if (sorted[i]!.startsAt < sorted[i - 1]!.endsAt) {
				ctx.addIssue({
					code: "custom",
					message: "As sessões não podem se sobrepor",
					path: ["sessions"],
				});
				break;
			}
		}
	});

const setTimeOnDate = (date: Date, time: string) => {
	const timeParts = time.split(":");
	date.setUTCHours(Number(timeParts[0]) + 3, Number(timeParts[1]));
};

export type MutateActivityFormSchema = z.infer<typeof mutateActivityFormSchema>;
