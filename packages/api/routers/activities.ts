import { db } from "@verific/drizzle";
import {
	activity,
	speaker,
	participant,
	participantOnActivity,
	project,
	user,
} from "@verific/drizzle/schema";
import {
	and,
	desc,
	eq,
	inArray,
	or,
	ilike,
	asc,
	getTableColumns,
	countDistinct,
	count, // <-- Adicionado aqui
} from "@verific/drizzle/orm";
import { z } from "zod";

// tRPC
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// Utils
import { isMemberAuthenticated } from "../auth";
import { transformSingleToArray } from "../utils";

// Enums
import { activityCategories } from "@verific/drizzle/enum/category";
import { activityAudiences } from "@verific/drizzle/enum/audience";

export const activitySort = ["recent", "oldest", "alphabetical"] as const;

export const getActivityParams = z.object({
	page: z.coerce.number().default(0).optional(),
	pageSize: z.coerce.number().default(5).optional(),
	search: z.string().optional(),
	sortBy: z.enum(["recent", "oldest"]).optional(),
});

export const getActivitiesParams = z.object({
	query: z.string().optional(),
	sort: z.enum(activitySort).optional(),
	page: z.coerce.number().default(0).optional(),
	pageSize: z.coerce.number().default(10).optional(),
	category: z
		.union([
			z.array(z.enum(activityCategories)),
			z.enum(activityCategories),
		])
		.transform(transformSingleToArray)
		.optional(),
	audience: z
		.union([z.array(z.enum(activityAudiences)), z.enum(activityAudiences)])
		.transform(transformSingleToArray)
		.optional(),
	speakerIds: z
		.union([z.array(z.string()), z.string()])
		.transform(transformSingleToArray)
		.optional(),
});

const mutateActivityParams = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	dateFrom: z.coerce.date(),
	dateTo: z.coerce.date(),
	category: z.enum(activityCategories),
	audience: z.enum(activityAudiences),
	speakerId: z.string().optional(),
	participantsLimit: z.coerce.number().optional(),
	tolerance: z.coerce.number().optional(),
	workload: z.coerce.number().optional(),
	projectId: z.string().uuid(),
});

// Função auxiliar para calcular ids a adicionar/remover
function getParticipantsIdsToMutate(newIds: string[], currentIds: string[]) {
	const idsToAdd = newIds.filter((id) => !currentIds.includes(id));
	const idsToRemove = currentIds.filter((id) => !newIds.includes(id));
	return { idsToAdd, idsToRemove };
}

export const activitiesRouter = createTRPCRouter({
	getActivity: publicProcedure
		.input(getActivityParams.extend({ activityId: z.string().uuid() }))
		.query(async ({ input, ctx }) => {
			const {
				activityId,
				page = 0,
				pageSize = 5,
				search,
				sortBy,
			} = input;

			const userId = ctx.session?.user.id;

			const selectedActivity = await db.query.activity.findFirst({
				where(fields) {
					return eq(fields.id, activityId);
				},
				with: {
					project: true,
					speaker: true,
				},
			});

			if (!selectedActivity) {
				throw new TRPCError({
					message: "Activity not found.",
					code: "BAD_REQUEST",
				});
			}

			// Retornamos a atividade básica se o usuário não estiver logado
			if (!userId)
				return {
					activity: {
						...selectedActivity,
						participants: [],
					},
					pageCount: 0,
					participantId: null,
				};

			// Buscar todos os moderadores
			const moderatorParticipants = await db
				.select({
					participantOnActivity,
					participant,
					user,
				})
				.from(participantOnActivity)
				.innerJoin(
					participant,
					eq(participantOnActivity.participantId, participant.id),
				)
				.innerJoin(user, eq(participant.userId, user.id))
				.where(
					and(
						eq(participantOnActivity.activityId, activityId),
						eq(participant.role, "moderator"),
					),
				);

			// Buscar participantes não moderadores com paginação/filtro
			const nonModeratorWhere = [
				eq(participantOnActivity.activityId, activityId),
				eq(participant.role, "participant"),
			];

			if (search) {
				nonModeratorWhere.push(ilike(user.name, `%${search}%`));
			}

			const orderBy =
				sortBy === "recent"
					? desc(participantOnActivity.joinedAt)
					: asc(participantOnActivity.joinedAt);

			const nonModeratorParticipants = await db
				.select({
					participantOnActivity,
					participant,
					user,
				})
				.from(participantOnActivity)
				.innerJoin(
					participant,
					eq(participantOnActivity.participantId, participant.id),
				)
				.innerJoin(user, eq(participant.userId, user.id))
				.where(and(...nonModeratorWhere))
				.orderBy(orderBy)
				.offset(page * pageSize)
				.limit(pageSize);

			// Buscar total de participantes não moderadores para paginação
			const countResult = await db
				.select({ amount: count() })
				.from(participantOnActivity)
				.innerJoin(
					participant,
					eq(participantOnActivity.participantId, participant.id),
				)
				.innerJoin(user, eq(participant.userId, user.id))
				.where(and(...nonModeratorWhere));

			const amount = countResult?.[0]?.amount ?? 0;
			const pageCount = Math.ceil(amount / pageSize);

			const allParticipants = [
				...moderatorParticipants,
				...nonModeratorParticipants,
			].map((row) => {
				// Removemos a data em que o usuário se inscreveu no evento para que o
				// "joinedAt" de "participantOnActivity" não seja sobrescrito
				const { joinedAt, ...rest } = row.participant;

				return {
					...row.participantOnActivity,
					...rest,
					user: {
						name: row.user.name,
						email: row.user.email,
						image_url: row.user.image_url,
					},
				};
			});

			const formattedActivity = {
				...selectedActivity,
				participants: allParticipants,
			};

			return {
				activity: formattedActivity,
				pageCount,
				participantId: allParticipants.find(
					(participant) => participant.userId === userId,
				)?.id,
			};
		}),

	getActivities: publicProcedure
		.input(
			getActivitiesParams.extend({
				projectId: z.string().uuid().optional(),
				projectUrl: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const {
				projectId,
				projectUrl,
				page = 0,
				pageSize = 5,
				query,
				sort,
				category: rawCategory,
				audience: rawAudience,
				speakerIds: rawSpeakerIds,
			} = input;

			const categories = rawCategory;
			const audiences = rawAudience;
			const speakerIds = rawSpeakerIds?.map(Number);

			const projectWhere = projectId
				? eq(project.id, projectId)
				: projectUrl
					? eq(project.url, projectUrl)
					: undefined;

			if (!projectWhere) {
				throw new TRPCError({
					message: "Project ID or URL is required.",
					code: "BAD_REQUEST",
				});
			}

			const activitiesWhere = [
				projectWhere,
				categories ? inArray(activity.category, categories) : undefined,
				audiences ? inArray(activity.audience, audiences) : undefined,
				speakerIds
					? inArray(activity.speakerId, speakerIds)
					: undefined,
				query
					? or(
							ilike(activity.name, `%${query}%`),
							ilike(activity.description, `%${query}%`),
						)
					: undefined,
			].filter(Boolean);

			// Query de atividades
			const activities = await db
				.select({
					...getTableColumns(activity),
					project: {
						id: project.id,
						name: project.name,
						url: project.url,
					},
					speaker: {
						id: speaker.id,
						name: speaker.name,
						description: speaker.description,
						imageUrl: speaker.imageUrl,
					},
					participant: {
						role: participant.role,
						userId: participant.userId,
						id: participant.id,
					},
					participantOnActivity: {
						participantId: participantOnActivity.participantId,
						activityId: participantOnActivity.activityId,
					},
					user: { name: user.name, image_url: user.image_url },
				})
				.from(activity)
				.leftJoin(
					participantOnActivity,
					eq(activity.id, participantOnActivity.activityId),
				)
				.leftJoin(
					participant,
					eq(participantOnActivity.participantId, participant.id),
				)
				.leftJoin(user, eq(participant.userId, user.id))
				.leftJoin(speaker, eq(activity.speakerId, speaker.id))
				.leftJoin(project, eq(activity.projectId, project.id))
				.where(and(...activitiesWhere))
				.orderBy(
					sort === "recent"
						? asc(activity.dateFrom)
						: desc(activity.dateFrom),
				)
				.offset(page ? (page - 1) * pageSize : 0)
				.limit(pageSize);

			// Query de contagem
			const amountDb = await db
				.select({ amount: countDistinct(activity.id) })
				.from(activity)
				.leftJoin(project, eq(activity.projectId, project.id))
				.where(and(...activitiesWhere));

			const amount = amountDb[0]?.amount ?? 0;

			// Agregação dos participantes por atividade
			// Use a Record to aggregate by activity id for better performance and type safety
			type ActivityWithParticipants = Omit<
				(typeof activities)[number],
				"participant" | "user" | "participantOnActivity"
			> & {
				participants: Array<{
					role: string;
					userId: string;
					user: {
						name?: string | null;
						image_url?: string | null;
					};
				}>;
			};

			const activityMap: Record<string, ActivityWithParticipants> = {};

			for (const act of activities) {
				if (!activityMap[act.id]) {
					activityMap[act.id] = {
						...act,
						participants: act.participant
							? [
									{
										role: act.participant.role,
										userId: act.participant.userId,
										user: {
											name: act.user?.name,
											image_url: act.user?.image_url,
										},
									},
								]
							: [],
					};
				} else if (act.participant) {
					activityMap[act.id]?.participants.push({
						role: act.participant.role,
						userId: act.participant.userId,
						user: {
							name: act.user?.name,
							image_url: act.user?.image_url,
						},
					});
				}
			}

			const aggregatedActivities = Object.values(activityMap);
			const formattedActivities = aggregatedActivities.map((act) => {
				return { ...act, participants: act.participants };
			});

			const pageCount = Math.ceil(amount / pageSize);

			return {
				activities: formattedActivities,
				pageCount,
			};
		}),

	createActivity: protectedProcedure
		.input(mutateActivityParams)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id;

			if (!userId) {
				throw new TRPCError({
					message: "User not authenticated.",
					code: "UNAUTHORIZED",
				});
			}

			const {
				name,
				description,
				dateFrom,
				dateTo,
				category,
				audience,
				speakerId,
				participantsLimit,
				tolerance,
				workload,
				projectId,
			} = input;

			const inserted = await db
				.insert(activity)
				.values({
					name,
					description,
					dateFrom,
					dateTo,
					category,
					audience,
					speakerId: speakerId ? Number(speakerId) : undefined,
					participantsLimit,
					tolerance,
					workload,
					projectId,
				})
				.returning({ id: activity.id });

			const insertedActivityId = inserted[0]?.id;

			if (!insertedActivityId) {
				throw new TRPCError({
					message: "Failed to create activity.",
					code: "INTERNAL_SERVER_ERROR",
				});
			}

			// We add the user as a moderator by default
			const participantFromUser = await db
				.select({
					id: participant.id,
				})
				.from(participant)
				.where(
					and(
						eq(participant.userId, userId),
						eq(participant.projectId, projectId),
					),
				);

			if (!participantFromUser[0]?.id) {
				throw new TRPCError({
					message: "User not found in participants.",
					code: "NOT_FOUND",
				});
			}

			await db.insert(participantOnActivity).values({
				activityId: insertedActivityId,
				participantId: participantFromUser[0]?.id,
			});

			return { activityId: insertedActivityId };
		}),

	updateActivity: protectedProcedure
		.input(
			mutateActivityParams.partial().extend({
				activityId: z.string().uuid(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const {
				activityId,
				name,
				description,
				dateFrom,
				dateTo,
				category,
				audience,
				speakerId,
				participantsLimit,
				tolerance,
				workload,
			} = input;

			const error = await isMemberAuthenticated({
				userId: ctx.session.user.id,
			});

			if (error) throw new TRPCError(error);

			await db.transaction(async (tx) => {
				await tx
					.update(activity)
					.set({
						name,
						description,
						dateFrom,
						dateTo,
						category,
						audience,
						speakerId: speakerId ? Number(speakerId) : undefined,
						participantsLimit,
						tolerance,
						workload,
					})
					.where(eq(activity.id, activityId));
			});
			return { success: true };
		}),

	updateActivityParticipants: protectedProcedure
		.input(
			z.object({
				activityId: z.string().uuid(),
				participantsIdsToMutate: z
					.union([z.array(z.string()), z.string()])
					.transform(transformSingleToArray),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { activityId, participantsIdsToMutate } = input;

			if (!participantsIdsToMutate) {
				throw new TRPCError({
					message: "Participants not found.",
					code: "BAD_REQUEST",
				});
			}

			const error = await isMemberAuthenticated({
				userId: ctx.session.user.id,
			});
			if (error) throw new TRPCError(error);

			// Busca apenas os IDs atuais dos participantes da atividade
			const current = await db
				.select({ participantId: participantOnActivity.participantId })
				.from(participantOnActivity)
				.where(eq(participantOnActivity.activityId, activityId));
			const currentIds = current.map((p) => p.participantId);

			// Só adiciona quem ainda não está
			const toAdd = participantsIdsToMutate.filter(
				(id) => !currentIds.includes(id),
			);

			if (toAdd.length > 0) {
				await db.insert(participantOnActivity).values(
					toAdd.map((participantId) => ({
						activityId,
						participantId,
					})),
				);
			}

			return { success: true };
		}),

	addActivityParticipants: protectedProcedure
		.input(
			z.object({
				activityId: z.string().uuid(),
				participantsIdsToAdd: z
					.union([z.array(z.string()), z.string()])
					.transform(transformSingleToArray),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { activityId, participantsIdsToAdd } = input;

			if (!participantsIdsToAdd) {
				throw new TRPCError({
					message: "Participants not found.",
					code: "BAD_REQUEST",
				});
			}

			const error = await isMemberAuthenticated({
				userId: ctx.session.user.id,
			});
			if (error) throw new TRPCError(error);

			await db
				.insert(participantOnActivity)
				.values(
					participantsIdsToAdd.map((participantId) => ({
						activityId,
						participantId,
					})),
				)
				.onConflictDoNothing();

			return { success: true };
		}),

	deleteActivity: protectedProcedure
		.input(z.object({ activityId: z.string().uuid() }))
		.mutation(async ({ input, ctx }) => {
			const { activityId } = input;

			const userId = ctx.session.user.id;

			if (!userId) {
				throw new TRPCError({
					message: "User not authenticated.",
					code: "UNAUTHORIZED",
				});
			}

			// Verifica se o usuário é o dono do projeto
			const project = await db.query.project
				.findFirst({
					where(fields) {
						return eq(fields.ownerId, userId);
					},
				})
				.then((project) => !!project);

			if (!project) {
				throw new TRPCError({
					message: "User not authorized to delete this activity.",
					code: "FORBIDDEN",
				});
			}

			try {
				await db.delete(activity).where(eq(activity.id, activityId));
			} catch (error) {
				console.error("Error deleting activity:", error);
				throw new TRPCError({
					message: "Activity not found.",
					code: "BAD_REQUEST",
				});
			}
		}),
});
