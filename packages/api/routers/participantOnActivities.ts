import { z } from "@verific/zod";

import { db } from "@verific/drizzle";
import {
	activity,
	participant,
	participantOnActivity,
	project,
	projectModerator,
} from "@verific/drizzle/schema";
import { and, eq, count, inArray, isNotNull } from "@verific/drizzle/orm";

// tRPC
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const participantOnActivitiesRouter = createTRPCRouter({
	getActivitiesFromParticipant: protectedProcedure
		.input(
			z.object({
				projectUrl: z.string(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { projectUrl } = input;
			const userId = ctx.session.user.id;

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

			const activityIds = activities.map(onActivity => onActivity.activity.id);

			const joinedCounts = await db
				.select({
					activityId: participantOnActivity.activityId,
					count: count(),
				})
				.from(participantOnActivity)
				.where(
					and(
						inArray(participantOnActivity.activityId, activityIds),
						isNotNull(participantOnActivity.joinedAt),
					),
				)
				.groupBy(participantOnActivity.activityId);

			const countsMap = new Map(joinedCounts.map(c => [c.activityId, c.count]));

			const formattedActivities = activities.map((onActivity) => {
				const { speakerOnActivity, ...activityData } = onActivity.activity;

				return {
					...activityData,
					speakers: speakerOnActivity.map(s => s.speaker),
					role: onActivity.role,
					joinedAt: onActivity.joinedAt,
					participantsJoined: countsMap.get(activityData.id) || 0,
				};
			});

			return {
				activities: formattedActivities,
				participantId,
			};

		}),
	deleteParticipantFromActivity: protectedProcedure
		.input(
			z.object({
				projectUrl: z.string(),
				activityId: z.string().uuid(),
				participantId: z.string().uuid(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { projectUrl, activityId, participantId } = input;

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

			if (activityData.project.url !== projectUrl) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Atividade não pertence ao evento informado.",
				});
			}

			const participantData = await db.query.participant.findFirst({
				where: and(
					eq(participant.id, participantId),
					eq(participant.projectId, activityData.project.id),
				),
				columns: { userId: true },
			});

			if (!participantData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participante não encontrado no evento informado.",
				});
			}

			const isParticipant = participantData.userId === userId;
			const isOwner = activityData.project.ownerId === userId;
			const isModerator = activityData.project.moderators.length > 0;

			if (!isParticipant && !isOwner && !isModerator) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Você não tem permissão para remover participantes desta atividade.",
				});
			}

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
	getSubscribedActivitiesIdsFromParticipant: protectedProcedure
		.input(
			z.object({
				projectUrl: z.string(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { projectUrl } = input;
			const userId = ctx.session.user.id;

			const activities = await db
				.select({
					activityId: participantOnActivity.activityId,
					participantId: participantOnActivity.participantId,
				})
				.from(participantOnActivity)
				.innerJoin(
					participant,
					eq(participant.id, participantOnActivity.participantId),
				)
				.innerJoin(project, eq(project.id, participant.projectId))
				.innerJoin(activity, eq(activity.id, participantOnActivity.activityId))
				.where(
					and(
						eq(participant.userId, userId),
						eq(project.url, projectUrl),
						eq(activity.projectId, project.id),
					),
				);

			const participantId =
				activities.length > 0 ? activities[0]?.participantId : undefined;

			if (!participantId) {
				return null;
			}

			return { ids: activities.map((a) => a.activityId), participantId }
		}),
});
