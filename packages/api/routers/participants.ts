import { z } from "zod";

import { db } from "@verific/drizzle";
import {
	participant,
	participantOnActivity,
	project,
	user,
} from "@verific/drizzle/schema";
import {
	and,
	asc,
	count,
	desc,
	eq,
	getTableColumns,
	ilike,
	inArray,
	or,
} from "@verific/drizzle/orm";

// Enums
import { courses } from "@verific/drizzle/enum/course";
import { periods } from "@verific/drizzle/enum/period";
import { participantRoles } from "@verific/drizzle/enum/role";

// Utils
import { isMemberAuthenticated } from "../auth";
import { transformSingleToArray } from "../utils";

// tRPC
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const participantSort = ["asc", "desc", "name_asc", "name_desc"] as const;

export const getParticipantsParams = z.object({
	query: z.string().optional(), // Para busca por nome ou e-mail
	sort: z.enum(participantSort).optional(), // Ordenação por data
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
				},
			});

			if (!participantData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participant not found",
				});
			}

			const requestUserId = ctx.session?.user.id;

			const requestParticipant = requestUserId
				? await db.query.participant.findFirst({
					where: eq(participant.userId, requestUserId),
				})
				: undefined;

			if (!requestUserId || !requestParticipant) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not authorized to view this participant",
					cause: "You are not a participant of this project",
				});
			}

			if (
				requestParticipant?.role === "participant" &&
				requestUserId !== participantData.userId
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not authorized to view this participant",
					cause: "You are not the requested participant or a moderator of this project",
				});
			}

			const totalWorkload = Array.isArray(
				participantData.participantOnActivity,
			)
				? participantData.participantOnActivity.reduce(
					(
						total: number,
						item: { activity: { workload: number | null } },
					) => total + (item.activity?.workload || 0),
					0,
				)
				: 0;

			return {
				participant: participantData,
				isUser: requestUserId === participantData.userId,
				hours: totalWorkload,
				totalEventsAttended: Array.isArray(
					participantData.participantOnActivity,
				)
					? participantData.participantOnActivity.length
					: 0,
				clientRole: requestParticipant.role,
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
				role && role.length > 0
					? inArray(participant.role, role)
					: undefined,
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

			const [participants, countResult] = await Promise.all([
				db
					.select({
						...getTableColumns(participant),
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
					.offset(pageIndex ? pageIndex * pageSize : 0),
				db
					.select({ amount: count() })
					.from(participant)
					.leftJoin(user, eq(participant.userId, user.id))
					.where(and(...whereClauses.filter(Boolean))),
			]);

			const amount = countResult?.[0]?.amount ?? 0;
			const pageCount = Math.ceil(amount / pageSize);

			return {
				participants,
				pageCount,
			};
		}),

	checkParticipant: publicProcedure
		.input(
			z.object({
				projectUrl: z.string(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { projectUrl } = input;
			const userId = ctx.session?.user?.id;

			if (!userId) {
				return { isEnrolled: false };
			}

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

			return { isEnrolled: (result?.[0]?.exists ?? 0) > 0 };
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

			return { participantId: result?.[0]?.id ?? null };
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
});
