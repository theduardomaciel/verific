import { db } from "@verific/drizzle";
import type { SQL } from "@verific/drizzle/orm";
import {
	and,
	asc,
	count,
	desc,
	eq,
	exists,
	ilike,
	inArray,
	or,
	sql,
} from "@verific/drizzle/orm";
import {
	activity,
	activitySession,
	activityWaitlist,
	participant,
	participantOnActivity,
	project,
	sessionAttendance,
	user,
} from "@verific/drizzle/schema";
import { z } from "@verific/zod";

// Utils
import { isMemberAuthenticated } from "../auth";
import { parseCheckInCode } from "../lib/checkin-code";
import { requireProjectAccess } from "../lib/project-access";
import {
	loadNotificationRecipients,
	notifyEventRegistrationRemoved,
} from "../notifications";
import { getParticipantsParams } from "../schemas";
import { lockActivity } from "../seats";
import { settleActivity } from "../waitlist";

// Re-export client-safe schema so existing server imports keep working.
// Client components must import from `@verific/api/schemas` instead.
export { getParticipantsParams };

// tRPC
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const participantsRouter = createTRPCRouter({
	getParticipant: protectedProcedure
		.input(
			z.object({
				participantId: z.string().uuid(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { participantId } = input;

			const requestUserId = ctx.session?.user.id;
			if (!requestUserId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message:
						"User must be logged in to access participant data",
				});
			}

			const participantData = await db.query.participant.findFirst({
				where: eq(participant.id, participantId),
				with: {
					user: {
						columns: {
							name: true,
							email: true,
							image_url: true,
						},
					},
					participantOnActivity: {
						with: {
							activity: {
								columns: {
									workload: true,
								},
							},
						},
					},
					project: {
						with: {
							moderators: {
								columns: {
									userId: true,
								},
							},
						},
					},
				},
			});

			if (!participantData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participant not found",
				});
			}

			const isModerator =
				participantData.project.moderators.some(
					(mod) => mod.userId === requestUserId,
				) || participantData.project.ownerId === requestUserId;

			if (!isModerator && participantData.userId !== requestUserId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"You do not have permission to view this participant's data",
				});
			}

			// Verificamos se o participante requerido é um moderador
			const isModeratorParticipant =
				participantData.project.moderators.some(
					(mod) => mod.userId === participantData.userId,
				) || participantData.project.ownerId === participantData.userId;

			// Calcula o total de atividades e horas
			const activitiesAttended =
				participantData.participantOnActivity.length;
			const hours = participantData.participantOnActivity.reduce(
				(acc, pa) => {
					return acc + (pa.activity.workload || 0);
				},
				0,
			);

			return {
				participant: participantData,
				hours,
				totalEventsAttended: activitiesAttended,
				isModeratorParticipant,
				isModerator,
			};
		}),

	getParticipants: protectedProcedure
		.input(
			getParticipantsParams.extend({
				projectId: z.string().uuid(), // ID do projeto
			}),
		)
		.query(async ({ input, ctx }) => {
			const {
				projectId,
				role,
				sort,
				query: search,
				page: pageIndex,
				pageSize,
			} = input;

			await requireProjectAccess(projectId, ctx.session.user.id);

			let roleFilter: SQL | undefined;
			if (role && role.length > 0) {
				roleFilter = exists(
					db
						.select()
						.from(participantOnActivity)
						.innerJoin(
							activity,
							eq(participantOnActivity.activityId, activity.id),
						)
						.where(
							and(
								eq(
									participantOnActivity.participantId,
									participant.id,
								),
								eq(activity.projectId, projectId),
								inArray(participantOnActivity.role, role),
							),
						),
				);
			}

			const whereClauses = [
				eq(participant.projectId, projectId),
				search
					? or(
							ilike(user.name, `%${search}%`),
							ilike(user.email, `%${search}%`),
						)
					: undefined,
				roleFilter,
			];

			let orderByClause;

			switch (sort) {
				case "asc":
					orderByClause = asc(participant.joinedAt);
					break;
				case "desc":
					orderByClause = desc(participant.joinedAt);
					break;
				case "name_asc":
					orderByClause = asc(user.name);
					break;
				case "name_desc":
					orderByClause = desc(user.name);
					break;
				default:
					// "recent"
					orderByClause = desc(participant.joinedAt);
			}

			const [participants, countResult, emailDomains] = await Promise.all(
				[
					db
						.select({
							id: participant.id,
							userId: participant.userId,
							projectId: participant.projectId,
							joinedAt: participant.joinedAt,
							user: {
								name: user.name,
								email: user.email,
								image_url: user.image_url,
							},
						})
						.from(participant)
						.leftJoin(user, eq(participant.userId, user.id))
						.where(and(...whereClauses.filter(Boolean)))
						.orderBy(orderByClause)
						.limit(pageSize)
						.offset(pageIndex ? (pageIndex - 1) * pageSize : 0),
					db
						.select({ amount: count() })
						.from(participant)
						.leftJoin(user, eq(participant.userId, user.id))
						.where(and(...whereClauses.filter(Boolean))),
					// Extrai os domínios de e-mail únicos dos participantes
					db
						.select({
							emailDomain: sql`SPLIT_PART(${user.email}, '@', 2)`,
						})
						.from(participant)
						.leftJoin(user, eq(participant.userId, user.id))
						.where(eq(participant.projectId, projectId))
						.groupBy(sql`SPLIT_PART(${user.email}, '@', 2)`),
				],
			);

			const amount = countResult?.[0]?.amount ?? 0;
			const pageCount = Math.ceil(amount / pageSize);

			return {
				participants,
				pageCount,
				emailDomains: emailDomains.map(
					(ed) => ed.emailDomain,
				) as string[],
			};
		}),

	checkParticipant: protectedProcedure
		.input(
			z.object({
				projectUrl: z.string(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { projectUrl } = input;
			const userId = ctx.session.user.id;

			// Faz uma única query para verificar se existe o participante no projeto pelo projectUrl
			const result = await db
				.select({ exists: count() })
				.from(participant)
				.innerJoin(project, eq(participant.projectId, project.id))
				.where(
					and(
						eq(project.url, projectUrl),
						eq(participant.userId, userId),
					),
				);

			return (result?.[0]?.exists ?? 0) > 0;
		}),

	getParticipantIdByProjectUrl: publicProcedure
		.input(
			z.object({
				projectUrl: z.string(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { projectUrl } = input;
			const userId = ctx.session?.user?.id;

			if (!userId) {
				return { participantId: null };
			}

			const result = await db
				.select({ id: participant.id })
				.from(participant)
				.innerJoin(project, eq(participant.projectId, project.id))
				.where(
					and(
						eq(project.url, projectUrl),
						eq(participant.userId, userId),
					),
				);

			return { participantId: result?.[0]?.id ?? null, userId };
		}),

	updateSessionPresence: protectedProcedure
		.input(
			z.object({
				sessionId: z.string().uuid(),
				// shortId do ingresso ou URL pública do perfil do crachá.
				code: z.string().trim().min(1).max(2048),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { sessionId, code } = input;

			const error = await isMemberAuthenticated({
				userId: ctx.session.user.id,
			});

			if (error) {
				throw new TRPCError(error);
			}

			let parsed: ReturnType<typeof parseCheckInCode>;
			try {
				parsed = parseCheckInCode(code);
			} catch {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "QR inválido para credenciamento.",
				});
			}

			const session = await db.query.activitySession.findFirst({
				where: eq(activitySession.id, sessionId),
				with: {
					activity: {
						columns: { id: true, projectId: true },
						with: {
							project: {
								columns: { id: true, ownerId: true },
								with: {
									moderators: { columns: { userId: true } },
								},
							},
						},
					},
				},
			});

			if (!session?.activity) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Sessão não encontrada",
				});
			}

			// Só a equipe do evento credencia (dono ou moderador).
			const staffUserId = ctx.session.user.id;
			const event = session.activity.project;
			const isStaff =
				event.ownerId === staffUserId ||
				event.moderators.some((m) => m.userId === staffUserId);
			if (!isStaff) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Apenas a equipe do evento pode credenciar.",
				});
			}

			// Resolve o código para o participante, sempre no escopo do
			// evento da sessão (índice único projectId + shortId).
			const row = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, event.id),
					eq(participant.shortId, parsed.shortId),
				),
				columns: { id: true },
				with: { user: { columns: { name: true } } },
			});
			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participante não encontrado neste evento.",
				});
			}
			const participantId = row.id;
			const participantName = row.user.name;

			// Só permite credenciar quem está inscrito na atividade
			const subscription = await db
				.select({ amount: count() })
				.from(participantOnActivity)
				.where(
					and(
						eq(
							participantOnActivity.activityId,
							session.activityId,
						),
						eq(participantOnActivity.participantId, participantId),
					),
				);

			if ((subscription?.[0]?.amount ?? 0) === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Participante não está inscrito na atividade",
				});
			}

			if (!participantName) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participante não encontrado.",
				});
			}

			await db
				.insert(sessionAttendance)
				.values({
					sessionId,
					participantId,
					joinedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: [
						sessionAttendance.sessionId,
						sessionAttendance.participantId,
					],
					set: {
						joinedAt: new Date(),
					},
				});

			return { success: true, participantId, name: participantName };
		}),
	removeParticipant: protectedProcedure
		.input(
			z.object({
				participantId: z.string().uuid(),
				/** Optional reason shown in the removal e-mail. */
				reason: z.string().trim().max(500).optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { participantId, reason } = input;
			const requestUserId = ctx.session?.user.id;

			if (!requestUserId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User must be logged in",
				});
			}

			const participantData = await db.query.participant.findFirst({
				where: eq(participant.id, participantId),
				with: {
					project: {
						with: {
							moderators: {
								columns: {
									userId: true,
								},
							},
						},
					},
				},
			});

			if (!participantData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participant not found",
				});
			}

			const isModerator =
				participantData.project.moderators.some(
					(mod) => mod.userId === requestUserId,
				) || participantData.project.ownerId === requestUserId;

			if (!isModerator) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"You do not have permission to remove this participant",
				});
			}

			// Capturado antes do delete: a linha de participante some na
			// transação e o e-mail de aviso precisa de um destinatário.
			const contacts = await loadNotificationRecipients([participantId]);
			const recipientEmail = contacts.get(participantId);

			// Atividades em que a pessoa ocupa vaga ou está na fila: a remoção
			// (em cascata) libera lugar para o próximo de cada fila
			const [enrolled, queued] = await Promise.all([
				db
					.select({ activityId: participantOnActivity.activityId })
					.from(participantOnActivity)
					.where(
						eq(participantOnActivity.participantId, participantId),
					),
				db
					.select({ activityId: activityWaitlist.activityId })
					.from(activityWaitlist)
					.where(
						and(
							eq(activityWaitlist.participantId, participantId),
							inArray(activityWaitlist.status, [
								"waiting",
								"offered",
							]),
						),
					),
			]);
			const activityIds = [
				...new Set(
					[...enrolled, ...queued].map((row) => row.activityId),
				),
			].sort();

			await db.transaction(async (tx) => {
				const locked = [];
				for (const activityId of activityIds) {
					locked.push(await lockActivity(tx, activityId));
				}

				await tx
					.delete(participant)
					.where(eq(participant.id, participantId));

				for (const lockedActivity of locked) {
					await settleActivity(tx, lockedActivity);
				}
			});

			if (recipientEmail) {
				void notifyEventRegistrationRemoved({
					eventId: participantData.project.id,
					registrationId: participantId,
					to: recipientEmail,
					...(reason ? { reason } : {}),
				});
			}

			return { success: true };
		}),
	removeSelfFromEvent: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { projectId } = input;
			const requestUserId = ctx.session?.user.id;

			if (!requestUserId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User must be logged in",
				});
			}

			// Find the participant for the current user in this project
			const participantData = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, projectId),
					eq(participant.userId, requestUserId),
				),
				with: {
					project: {
						with: {
							moderators: {
								columns: {
									userId: true,
								},
							},
						},
					},
				},
			});

			if (!participantData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participant not found",
				});
			}

			const participantId = participantData.id;

			// Atividades em que a pessoa ocupa vaga ou está na fila: a remoção
			// (em cascata) libera lugar para o próximo de cada fila
			const [enrolled, queued] = await Promise.all([
				db
					.select({ activityId: participantOnActivity.activityId })
					.from(participantOnActivity)
					.where(
						eq(participantOnActivity.participantId, participantId),
					),
				db
					.select({ activityId: activityWaitlist.activityId })
					.from(activityWaitlist)
					.where(
						and(
							eq(activityWaitlist.participantId, participantId),
							inArray(activityWaitlist.status, [
								"waiting",
								"offered",
							]),
						),
					),
			]);
			const activityIds = [
				...new Set(
					[...enrolled, ...queued].map((row) => row.activityId),
				),
			].sort();

			await db.transaction(async (tx) => {
				const locked = [];
				for (const activityId of activityIds) {
					locked.push(await lockActivity(tx, activityId));
				}

				await tx
					.delete(participant)
					.where(eq(participant.id, participantId));

				for (const lockedActivity of locked) {
					await settleActivity(tx, lockedActivity);
				}
			});

			return { success: true };
		}),
});
