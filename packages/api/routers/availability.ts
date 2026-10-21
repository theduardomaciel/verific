import { db } from "@verific/drizzle";
import { and, count, eq, inArray } from "@verific/drizzle/orm";
import {
	activity,
	activityWaitlist,
	participantOnActivity,
} from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

/**
 * Disponibilidade pública de uma atividade.
 *
 * Contagens de inscritos/ofertas mudam a cada join, saída, promoção e
 * check-in. Manter esses números dentro do shell estático obrigaria toda
 * mutation de contagem a invalidar a página inteira (e, no caso da lista,
 * as ~29 páginas de atividade do evento). Esta query é pública e não lê
 * `ctx.session`: o handler HTTP do app aplica `s-maxage=60`, então a
 * contagem corrige em até um minuto sem gastar ISR.
 *
 * O cálculo replica o `participantsAmount` público de `getActivity`:
 * inscritos com papel `participant` + ofertas de fila ainda em aberto.
 * `waitlistCount` é a fila em espera (sem contar ofertas), útil para
 * exibição futura sem outra ida ao banco.
 */
export const availabilityRouter = createTRPCRouter({
	getActivityAvailability: publicProcedure
		.input(
			z.object({
				projectId: z.uuid(),
				activityIds: z.array(z.uuid()).min(1).max(500),
			}),
		)
		.query(async ({ input }) => {
			const activityIds = [...new Set(input.activityIds)];

			const [validActivities, participantRows, waitlistRows] =
				await Promise.all([
					db
						.select({ id: activity.id })
						.from(activity)
						.where(
							and(
								eq(activity.projectId, input.projectId),
								inArray(activity.id, activityIds),
							),
						),
					db
						.select({
							activityId: participantOnActivity.activityId,
							amount: count(),
						})
						.from(participantOnActivity)
						.where(
							and(
								inArray(
									participantOnActivity.activityId,
									activityIds,
								),
								eq(participantOnActivity.role, "participant"),
							),
						)
						.groupBy(participantOnActivity.activityId),
					db
						.select({
							activityId: activityWaitlist.activityId,
							status: activityWaitlist.status,
							amount: count(),
						})
						.from(activityWaitlist)
						.where(
							and(
								inArray(
									activityWaitlist.activityId,
									activityIds,
								),
								inArray(activityWaitlist.status, [
									"waiting",
									"offered",
								]),
							),
						)
						.groupBy(
							activityWaitlist.activityId,
							activityWaitlist.status,
						),
				]);

			const validIds = new Set(validActivities.map((row) => row.id));
			const counts = new Map<
				string,
				{ participants: number; offered: number; waiting: number }
			>();

			for (const activityId of activityIds) {
				if (validIds.has(activityId)) {
					counts.set(activityId, {
						participants: 0,
						offered: 0,
						waiting: 0,
					});
				}
			}

			for (const row of participantRows) {
				const entry = counts.get(row.activityId);
				if (entry) entry.participants = Number(row.amount);
			}

			for (const row of waitlistRows) {
				const entry = counts.get(row.activityId);
				if (!entry) continue;
				if (row.status === "offered") {
					entry.offered = Number(row.amount);
				} else {
					entry.waiting = Number(row.amount);
				}
			}

			return [...counts.entries()].map(([activityId, entry]) => ({
				activityId,
				participantsCount: entry.participants + entry.offered,
				waitlistCount: entry.waiting,
			}));
		}),
});
