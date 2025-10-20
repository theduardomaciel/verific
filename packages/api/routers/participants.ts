import { z } from "zod";

import { db } from "@verific/drizzle";
import {
	activity,
	participant,
	participantOnActivity,
	project,
	projectModerator,
	user,
} from "@verific/drizzle/schema";
import {
	and,
	asc,
	count,
	desc,
	eq,
	exists,
	getTableColumns,
	ilike,
	inArray,
	or,
	sql,
	SQL,
} from "@verific/drizzle/orm";

// Enums
import { courses } from "@verific/drizzle/enum/course";
import { periods } from "@verific/drizzle/enum/period";
import { participantRoles } from "@verific/drizzle/enum/role";

// Utils
import { isMemberAuthenticated } from "../auth";
import { sortOptions } from "../utils";

// tRPC
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const getParticipantsParams = z.object({
	query: z.string().optional(), // Para busca por nome ou e-mail
	sort: z.enum(sortOptions).optional(), // Ordenação por data
	page: z.coerce.number().default(0), // Paginação: página atual
	pageSize: z.coerce.number().default(10), // Paginação: tamanho da página,
	role: z.array(z.enum(participantRoles)).optional(), // Funções dos participantes
	course: z.array(z.enum(courses)).optional(), // Cursos dos participantes
	period: z.array(z.enum(periods)).optional(), // Períodos dos participantes
});

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
					message: "User must be logged in to access participant data",
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
								}
							}
						}
					},
				},
			});

			if (!participantData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participant not found",
				});
			}

			const isModerator = participantData.project.moderators.some((mod => mod.userId === requestUserId))
				|| participantData.project.ownerId === requestUserId;

			if (!isModerator && participantData.userId !== requestUserId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have permission to view this participant's data",
				});
			}

			// Verificamos se o participante requerido é um moderador
			const isModeratorParticipant = participantData.project.moderators.some((mod) => mod.userId === participantData.userId)
				|| participantData.project.ownerId === participantData.userId;

			// Calcula o total de atividades e horas
			const activitiesAttended = participantData.participantOnActivity.length;
			const hours = participantData.participantOnActivity.reduce((acc, pa) => {
				return acc + (pa.activity.workload || 0);
			}, 0);

			return {
				participant: participantData,
				hours,
				totalEventsAttended: activitiesAttended,
				isModeratorParticipant,
				isModerator,
			};
		}),

	getParticipants: publicProcedure
		.input(
			getParticipantsParams.extend({
				projectId: z.string().uuid(), // ID do projeto
			}),
		)
		.query(async ({ input }) => {
			const {
				projectId,
				role,
				sort,
				query: search,
				page: pageIndex,
				period: periodsFilter,
				pageSize,
				course,
			} = input;

			let roleFilter: SQL | undefined;
			if (role && role.length > 0) {
				roleFilter = exists(
					db.select().from(participantOnActivity).innerJoin(activity, eq(participantOnActivity.activityId, activity.id)).where(and(
						eq(participantOnActivity.participantId, participant.id),
						eq(activity.projectId, projectId),
						inArray(participantOnActivity.role, role),
					))
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
				periodsFilter && periodsFilter.length > 0
					? inArray(participant.period, periodsFilter)
					: undefined,
				roleFilter,
				course && course.length > 0
					? inArray(participant.course, course)
					: undefined,
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

			const [participants, countResult, emailDomains, participantsCourses] = await Promise.all([
				db
					.select({
						id: participant.id,
						userId: participant.userId,
						projectId: participant.projectId,
						joinedAt: participant.joinedAt,
						course: participant.course,
						period: participant.period,
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
					.select({ emailDomain: sql`SPLIT_PART(${user.email}, '@', 2)` })
					.from(participant)
					.leftJoin(user, eq(participant.userId, user.id))
					.where(eq(participant.projectId, projectId))
					.groupBy(sql`SPLIT_PART(${user.email}, '@', 2)`),
				// Extrai os cursos únicos dos participantes
				db
					.select({ course: participant.course })
					.from(participant)
					.where(eq(participant.projectId, projectId))
					.groupBy(participant.course),
			]);

			const amount = countResult?.[0]?.amount ?? 0;
			const pageCount = Math.ceil(amount / pageSize);

			return {
				participants,
				pageCount,
				emailDomains: emailDomains.map((ed) => ed.emailDomain) as string[],
				courses: participantsCourses.map((pc) => pc.course) as string[],
			};
		}),

	checkParticipant: publicProcedure
		.input(
			z.object({
				projectUrl: z.string(),
				userId: z.string().uuid(),
			}),
		)
		.query(async ({ input }) => {
			const { projectUrl, userId } = input;

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

			return (result?.[0]?.exists ?? 0) > 0
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

	updateParticipantPresence: protectedProcedure
		.input(
			z.object({
				activityId: z.string().uuid(),
				participantId: z.string().uuid(),
				presence: z.boolean().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { activityId, participantId } = input;

			const error = await isMemberAuthenticated({
				userId: ctx.session.user.id,
			});

			if (error) {
				throw new TRPCError(error);
			}

			// Upsert: se já existe, atualiza joinedAt e presence; senão, insere
			await db
				.insert(participantOnActivity)
				.values({
					activityId,
					participantId,
					joinedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: [
						participantOnActivity.activityId,
						participantOnActivity.participantId,
					],
					set: {
						joinedAt: new Date(),
					},
				});

			return { success: true };
		}),
	removeParticipant: protectedProcedure
		.input(
			z.object({
				participantId: z.string().uuid(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { participantId } = input;
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
				participantData.project.moderators.some((mod) => mod.userId === requestUserId) ||
				participantData.project.ownerId === requestUserId;

			if (!isModerator) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have permission to remove this participant",
				});
			}

			await db.delete(participant).where(eq(participant.id, participantId));

			return { success: true };
		}),
});
