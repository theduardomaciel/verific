import { z } from "zod";

import { db } from "@verific/drizzle";
import {
	activity,
	participant,
	participantOnActivity,
	project,
	projectModerator,
} from "@verific/drizzle/schema";
import { and, eq } from "@verific/drizzle/orm";

// tRPC
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const participantOnActivitiesRouter = createTRPCRouter({
	getActivitiesFromParticipant: publicProcedure
		.input(
			z.object({
				projectUrl: z.string(),
				userId: z.string().uuid(),
			}),
		)
		.query(async ({ input }) => {
			const { projectUrl, userId } = input;

			// Precisamos buscar o projeto pois precisamos do projectId para buscar o participante
			// E precisamos do participantId para buscar as atividades
			const projectWithParticipant = await db
				.select({
					projectId: project.id,
					participantId: participant.id,
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

			if (!participantId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participante não encontrado no projeto",
				});
			}

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
								speakerOnActivity: {
									with: {
										speaker: true,
									},
								},
							},
						},
					},
				});

			// Retornamos a atividade com os palestrantes e o papel do participante na atividade
			// Não retornamos outros dados como os outros participantes inscritos

			const formattedActivities = activities.map((onActivity) => {
				const { speakerOnActivity, ...activityData } = onActivity.activity;

				return {
					...activityData,
					speakers: speakerOnActivity.map(s => s.speaker),
					role: onActivity.role,
					joinedAt: onActivity.joinedAt,
				};
			});

			return {
				activities: formattedActivities,
				participantId,
			};

		}),
	deleteParticipantFromActivity: publicProcedure
		.input(
			z.object({
				projectUrl: z.string(),
				activityId: z.string().uuid(),
				participantId: z.string().uuid(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { activityId, participantId } = input;

			const userId = ctx.session?.user.id;

			if (!userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Usuário não autenticado",
				});
			}

			// Fetch the activity and check moderator status in one query
			const activityData = await db.query.activity.findFirst({
				where: eq(activity.id, activityId),
				with: {
					project: {
						with: {
							moderators: {
								where: eq(projectModerator.userId, userId),
							},
						},
					},
				},
			});

			if (!activityData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Atividade não encontrada",
				});
			}

			const isOwner = activityData.project.ownerId === userId;
			const isModerator = activityData.project.moderators.length > 0;

			// TODO: Adicionar isso aqui novamente, porém verificando se o usuário que está tentando remover é ele mesmo
			/* if (!isOwner && activityData.project.moderators.length === 0) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Você não tem permissão para remover participantes desta atividade.",
				});
			} */

			await db
				.delete(participantOnActivity)
				.where(
					and(
						eq(participantOnActivity.activityId, activityId),
						eq(participantOnActivity.participantId, participantId),
					),
				);

			return { success: true };
		}),
	getSubscribedActivitiesIdsFromParticipant: publicProcedure
		.input(
			z.object({
				userId: z.string().uuid(),
			}),
		)
		.query(async ({ input }) => {
			const { userId } = input;

			const activities = await db
				.select({
					activityId: participantOnActivity.activityId,
					participantId: participantOnActivity.participantId,
				})
				.from(participantOnActivity)
				.leftJoin(
					participant,
					eq(participant.id, participantOnActivity.participantId),
				)
				.where(eq(participant.userId, userId));

			return {
				ids: activities.map((a) => a.activityId), participantId: activities.length > 0 ? activities[0]?.participantId : undefined
			}
		}),
});
