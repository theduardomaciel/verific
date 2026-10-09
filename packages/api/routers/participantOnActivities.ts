// tRPC
import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import {
	and,
	asc,
	eq,
	count,
	countDistinct,
	inArray,
} from "@verific/drizzle/orm";
import {
	activity,
	activitySession,
	participant,
	participantOnActivity,
	project,
	projectModerator,
	sessionAttendance,
} from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import { deleteActivityAnswers } from "../enrollment";
import { lockActivity } from "../seats";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { settleActivity } from "../waitlist";

import type { ParticipantActivitySession } from "../schemas";

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

			const activities = await db.query.participantOnActivity.findMany({
				where: (participantOnActivity, { eq }) =>
					eq(participantOnActivity.participantId, participantId),
				with: {
					activity: {
						with: {
							sessions: {
								orderBy: asc(activitySession.startsAt),
								with: {
									attendances: {
										where: eq(
											sessionAttendance.participantId,
											participantId,
										),
									},
								},
							},
							tagOnActivity: {
								with: {
									tag: true,
								},
							},
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

			const activityIds = activities.map(
				(onActivity) => onActivity.activity.id,
			);

			// Presentes = participantes distintos com pelo menos uma presença em sessão
			const attendedCounts =
				activityIds.length > 0
					? await db
							.select({
								activityId: activitySession.activityId,
								count: countDistinct(
									sessionAttendance.participantId,
								),
							})
							.from(sessionAttendance)
							.innerJoin(
								activitySession,
								eq(
									sessionAttendance.sessionId,
									activitySession.id,
								),
							)
							.where(
								inArray(
									activitySession.activityId,
									activityIds,
								),
							)
							.groupBy(activitySession.activityId)
					: [];

			const countsMap = new Map(
				attendedCounts.map((c) => [c.activityId, c.count]),
			);

			// Presentes por sessão (para a visão do monitor no ingresso)
			const sessionIds = activities.flatMap(
				(onActivity) =>
					onActivity.activity.sessions?.map((s) => s.id) ?? [],
			);
			const sessionCountRows =
				sessionIds.length > 0
					? await db
							.select({
								sessionId: sessionAttendance.sessionId,
								count: count(),
							})
							.from(sessionAttendance)
							.where(
								inArray(
									sessionAttendance.sessionId,
									sessionIds,
								),
							)
							.groupBy(sessionAttendance.sessionId)
					: [];
			const sessionCountsMap = new Map(
				sessionCountRows.map((c) => [c.sessionId, c.count]),
			);

			const formattedActivities = activities.map((onActivity) => {
				const {
					speakerOnActivity,
					sessions,
					tagOnActivity,
					...activityData
				} = onActivity.activity;

				const dtoSessions: ParticipantActivitySession[] = (
					sessions ?? []
				).map((session) => ({
					id: session.id,
					startsAt: session.startsAt,
					endsAt: session.endsAt,
					address: session.address,
					joinedAt: session.attendances?.[0]?.joinedAt ?? null,
					attendedCount: sessionCountsMap.get(session.id) ?? 0,
				}));

				return {
					...activityData,
					speakers: speakerOnActivity.map((s) => s.speaker),
					tags: (tagOnActivity ?? []).map((t) => t.tag),
					sessions: dtoSessions,
					role: onActivity.role,
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
					message:
						"Você não tem permissão para remover participantes desta atividade.",
				});
			}

			await db.transaction(async (tx) => {
				const locked = await lockActivity(tx, activityId);

				await tx
					.delete(participantOnActivity)
					.where(
						and(
							eq(participantOnActivity.activityId, activityId),
							eq(
								participantOnActivity.participantId,
								participantId,
							),
						),
					);

				// Remove presenças em sessões desta atividade (assinatura removida)
				const activitySessions = await tx
					.select({ id: activitySession.id })
					.from(activitySession)
					.where(eq(activitySession.activityId, activityId));

				if (activitySessions.length > 0) {
					await tx.delete(sessionAttendance).where(
						and(
							eq(sessionAttendance.participantId, participantId),
							inArray(
								sessionAttendance.sessionId,
								activitySessions.map((s) => s.id),
							),
						),
					);
				}

				await deleteActivityAnswers(tx, activityId, [participantId]);

				// A vaga liberada vai para o próximo da fila
				await settleActivity(tx, locked);
			});

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

			// Vínculo com o evento primeiro: quem está inscrito no evento
			// mas em zero atividades precisa receber `{ ids: [], participantId }`
			// — retornar `null` aqui travava a primeira inscrição (o painel
			// virava `not-in-event`).
			const projectWithParticipant = await db
				.select({
					projectId: project.id,
					participantId: participant.id,
				})
				.from(project)
				.leftJoin(
					participant,
					and(
						eq(participant.projectId, project.id),
						eq(participant.userId, userId),
					),
				)
				.where(eq(project.url, projectUrl));

			const projectRow = projectWithParticipant[0];
			const participantId = projectRow?.participantId;

			if (!projectRow || !participantId) {
				return null;
			}

			const activities = await db
				.select({
					activityId: participantOnActivity.activityId,
				})
				.from(participantOnActivity)
				.innerJoin(
					activity,
					eq(activity.id, participantOnActivity.activityId),
				)
				.where(
					and(
						eq(participantOnActivity.participantId, participantId),
						eq(activity.projectId, projectRow.projectId),
					),
				);

			return { ids: activities.map((a) => a.activityId), participantId };
		}),
});
