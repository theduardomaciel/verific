import { activityAudiences } from "@verific/drizzle/enum/audience";
import { activityCategories } from "@verific/drizzle/enum/category";
import { isDayKey, minutesOf, WALL_TIME_REGEX } from "@verific/drizzle/time";
import { z } from "@verific/zod";

export const activitySessionFormSchema = z.object({
	/** Id de uma sessão já salva (ausente em sessões novas). */
	id: z.uuid().optional(),
	/** Dia da sessão no fuso do evento. */
	date: z
		.string({ error: "É necessário inserir a data da sessão" })
		.refine(isDayKey, "É necessário inserir a data da sessão"),
	timeFrom: z
		.string({
			error: "É necessário inserir o horário de início da sessão",
		})
		.regex(WALL_TIME_REGEX, "Formato de horário inválido"),
	timeTo: z
		.string({
			error: "É necessário inserir o horário de término da sessão",
		})
		.regex(WALL_TIME_REGEX, "Formato de horário inválido"),
	address: z.string().optional(),
});

export const mutateActivityFormSchema = z
	.object({
		name: z.string({ error: "O nome da atividade é obrigatório" }).min(3, {
			message: "O nome da atividade deve ter pelo menos 3 caracteres",
		}),
		description: z.string().optional(),
		isRegistrationOpen: z.boolean().optional(),
		allowOverlap: z.boolean().optional(),
		waitlistEnabled: z.boolean().optional(),
		participantsLimit: z
			.preprocess(
				(val) => (val === "" ? null : val),
				z.coerce
					.number()
					.int({
						message: "O limite de vagas deve ser um número inteiro",
					})
					.min(1, {
						message: "O limite de vagas deve ser de pelo menos 1",
					})
					.nullable(),
			)
			.optional(),
		tolerance: z
			.preprocess(
				(val) => (val === "" || val === 0 || val === "0" ? null : val),
				z.coerce
					.number()
					.int({
						message: "A tolerância deve ser um número inteiro",
					})
					.min(5, {
						message:
							"A tolerância deve ser de pelo menos 5 minutos",
					})
					.max(240, {
						message:
							"A tolerância deve ser de no máximo 240 minutos",
					})
					.nullable(),
			)
			.optional(),
		waitlistOfferMinutes: z.coerce
			.number()
			.int()
			.min(1)
			.max(10_080)
			.optional(),
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
				if (minutesOf(session.timeTo) <= minutesOf(session.timeFrom)) {
					ctx.addIssue({
						code: "custom",
						message:
							"Horário de término deve ser após o horário de início",
						path: ["sessions", i, "timeTo"],
					});
					continue;
				}
				// Dia e hora no mesmo fuso: a ordem do texto é a do tempo
				intervals.push({
					startsAt: `${session.date}T${session.timeFrom}`,
					endsAt: `${session.date}T${session.timeTo}`,
				});
			}
		}

		const sorted = [...intervals].sort((a, b) =>
			a.startsAt.localeCompare(b.startsAt),
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

export type MutateActivityFormSchema = z.infer<typeof mutateActivityFormSchema>;
