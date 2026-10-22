import { db } from "@verific/drizzle";
import { and, count, eq, inArray, or } from "@verific/drizzle/orm";
import {
	activity,
	activityWaitlist,
	participantOnActivity,
} from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import { openOfferWhere } from "../seats";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { seatsTaken } from "../waitlist-plan";

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
 * `participantsCount` é `seatsTaken`, o mesmo cálculo do `participantsAmount`
 * público de `getActivity`. `waitlistCount` é a fila em espera, sem contar
 * ofertas.
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
			const now = new Date();

			const [validActivities, participantRows, waitlistRows] =
				await Promise.all([
					db
						.select({
							id: activity.id,
							participantsLimit: activity.participantsLimit,
						})
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
								or(
									eq(activityWaitlist.status, "waiting"),
									openOfferWhere(now),
								),
							),
						)
						.groupBy(
							activityWaitlist.activityId,
							activityWaitlist.status,
						),
				]);

			const limits = new Map(
				validActivities.map((row) => [row.id, row.participantsLimit]),
			);
			const counts = new Map<
				string,
				{ participants: number; offered: number; waiting: number }
			>();

			for (const activityId of activityIds) {
				if (limits.has(activityId)) {
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
				participantsCount: seatsTaken({
					limit: limits.get(activityId) ?? null,
					enrolled: entry.participants,
					openOffers: entry.offered,
					waiting: entry.waiting,
				}),
				waitlistCount: entry.waiting,
			}));
		}),
});
