import { z } from "zod";

import { db } from "@verific/drizzle";
import {
	activity,
	participant,
	participantOnActivity,
	project,
	user,
} from "@verific/drizzle/schema";
import { and, eq, getTableColumns } from "@verific/drizzle/orm";

// tRPC
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const participantOnActivitiesRouter = createTRPCRouter({
	getActivitiesFromParticipant: publicProcedure
		.input(
			z.object({
				projectUrl: z.string(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { projectUrl } = input;
			const userId = ctx.session?.user.id;

			if (!userId) {
				return {
					isParticipant: false,
					activities: [],
					role: null,
				};
			}

			// Busca o projeto e o participante em uma única consulta
			const projectWithParticipant = await db
				.select({
					projectId: project.id,
					participantId: participant.id,
					role: participant.role,
				})
				.from(project)
				.leftJoin(participant, eq(participant.projectId, project.id))
				.where(
					and(
						eq(project.url, projectUrl),
						eq(participant.userId, userId),
					),
				);

			const projectRow = projectWithParticipant[0];
			const participantId = projectRow?.participantId;

			if (!!participantId) {
				/* const activities = await db
					.select({
						...getTableColumns(participantOnActivity),
						activity: {
							...getTableColumns(activity),
						},
					})
					.from(participantOnActivity)
					.innerJoin(
						activity,
						eq(activity.id, participantOnActivity.activityId),
					)
					.where(
						eq(participantOnActivity.participantId, participantId),
					); */
				const activities =
					await db.query.participantOnActivity.findMany({
						where: (participantOnActivity, { eq }) =>
							eq(
								participantOnActivity.participantId,
								participantId,
							),
						with: {
							activity: {
								with: {
									speaker: true,
									participantsOnActivity: true,
								},
							},
						},
					});

				return {
					isParticipant: true,
					activities,
					role: projectRow.role,
					participantId: participantId,
				};
			}

			// Se o participante não estiver inscrito, retorna um objeto vazio
			return {
				isParticipant: false,
				activities: [],
				role: null,
			};
		}),
	deleteParticipantFromActivity: publicProcedure
		.input(
			z.object({
				activityId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { activityId } = input;
			const userId = ctx.session?.user.id;

			if (!userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Usuário não autenticado",
				});
			}

			// Busca o participante pelo userId
			const participantData = await db.query.participant.findFirst({
				where: (participant, { eq }) => eq(participant.userId, userId),
				columns: { id: true, projectId: true },
			});

			if (!participantData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participante não encontrado",
				});
			}

			const participantId = participantData.id;

			// Verifica se a atividade existe e pertence ao mesmo projeto que o participante
			const activityData = await db.query.activity.findFirst({
				where: (activity, { eq }) =>
					and(
						eq(activity.id, activityId),
						eq(activity.projectId, participantData.projectId),
					),
				columns: { id: true },
			});

			if (!activityData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Atividade não encontrada",
				});
			}

			// Deleta a inscrição do participante na atividade
			const deleteCount = await db
				.delete(participantOnActivity)
				.where(and(
					eq(participantOnActivity.participantId, participantId),
					eq(participantOnActivity.activityId, activityId),
				))
				.returning({ id: participantOnActivity.participantId });

			if (!deleteCount.length) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Inscrição na atividade não encontrada",
				});
			}

			return { success: true };
		}),
});
