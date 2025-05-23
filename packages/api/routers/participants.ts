import { z } from "zod";

import { db } from "@verific/drizzle";
import {
	participant,
	participantOnActivity,
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

export const participantSort = ["recent", "oldest", "alphabetical"] as const; // Ordenação de participantes

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
				hours: totalWorkload,
				requestClientRole: requestParticipant.role,
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
					.orderBy(
						sort === "alphabetical"
							? asc(user.name)
							: sort === "oldest"
								? asc(participant.joinedAt)
								: desc(participant.joinedAt),
					)
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

	updateParticipantPresence: protectedProcedure
		.input(
			z.object({
				activityId: z.string().uuid(),
				verificationCode: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			/* const { activityId } = input;
			const participantId = ctx.session.participant?.id;
			const projectId = ctx.session.participant?.projectId;

			const error = await isMemberAuthenticated({
				projectId,
				userId: ctx.session.user.id,
			});

			if (error) {
				throw new TRPCError(error);
			}

			if (!participantId) {
				throw new TRPCError({
					message: "Participant not found.",
					code: "BAD_REQUEST",
				});
			}

			const alreadyPresent =
				await db.query.participantOnActivity.findFirst({
					where: and(
						eq(participantOnActivity.activityId, activityId),
						eq(participantOnActivity.participantId, participantId),
					),
				});

			if (alreadyPresent) {
				throw new TRPCError({
					message: "Participant is already present on the activity.",
					code: "BAD_REQUEST",
				});
			}

			await db.insert(participantOnActivity).values({
				activityId,
				participantId,
				joinedAt: new Date(),
			}); */

			return { success: true };
		}),
});
