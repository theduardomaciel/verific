import { db } from "@verific/drizzle";
import {
	activity,
	speakerOnActivity,
	participant,
	participantOnActivity,
	project,
	user,
} from "@verific/drizzle/schema";
import {
	and,
	desc,
	inArray,
	or,
	ilike,
	asc,
	eq,
	countDistinct,
	count,
} from "@verific/drizzle/orm";
import { z } from "zod";

// tRPC
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// Utils
import { isMemberAuthenticated } from "../auth";
import { createEnumArraySchema, sortOptions, transformSingleToArray } from "../utils";

// Enums
import { activityCategories } from "@verific/drizzle/enum/category";
import { activityAudiences } from "@verific/drizzle/enum/audience";

export const activitySort = ["asc", "desc", "name_asc", "name_desc"] as const;

export const getActivityParams = z.object({
	page: z.coerce.number().default(0).optional(),
	pageSize: z.coerce.number().default(5).optional(),
	search: z.string().optional(),
	sortBy: z.enum(sortOptions).optional(),
});

export const getActivitiesParams = z.object({
	query: z.string().optional(),
	sort: z.enum(activitySort).optional(),
	page: z.coerce.number().default(0).optional(),
	pageSize: z.coerce.number().default(10).optional(),
	category: createEnumArraySchema(activityCategories),
	audience: createEnumArraySchema(activityAudiences),
});

const mutateActivityParams = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	isRegistrationOpen: z.boolean().optional(),
	dateFrom: z.coerce.date(),
	dateTo: z.coerce.date(),
	category: z.enum(activityCategories),
	audience: z.enum(activityAudiences),
	speakerIds: z.array(z.coerce.number()).optional(),
	participantsLimit: z.coerce.number().optional(),
	address: z.string().optional(),
	latitude: z.number().optional(),
	longitude: z.number().optional(),
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
					speakerOnActivity: {
						with: {
							speaker: true,
						},
					},
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
			const monitorParticipants = await db
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
						eq(participant.role, "monitor"),
					),
				);

			// Buscar participantes não moderadores com paginação/filtro
			const nonMonitorWhere = [
				eq(participantOnActivity.activityId, activityId),
				eq(participant.role, "participant"),
			];

			if (search) {
				nonMonitorWhere.push(ilike(user.name, `%${search}%`));
			}

			const orderBy =
				sortBy === "desc"
					? desc(participantOnActivity.joinedAt)
					: asc(participantOnActivity.joinedAt);

			const nonMonitorParticipants = await db
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
				.where(and(...nonMonitorWhere))
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
				.where(and(...nonMonitorWhere));

			const amount = countResult?.[0]?.amount ?? 0;
			const pageCount = Math.ceil(amount / pageSize);

			const allParticipants = [
				...monitorParticipants,
				...nonMonitorParticipants,
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
				participantsAmount: amount,
				pageCount,
				participantId: allParticipants.find(
					(participant) => participant.userId === userId,
				)?.id,
				projectStartDate: selectedActivity.project.startDate,
				projectEndDate: selectedActivity.project.endDate,
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
			} = input;

			const categories = rawCategory as (typeof activityCategories)[number][] | undefined;
			const audiences = rawAudience as (typeof activityAudiences)[number][] | undefined;

			/* console.log("Fetching activities with params:", {
				projectId,
				projectUrl,
				page,
				pageSize,
				query,
				sort,
				categories,
				audiences,
			}); */

			let projectIdToUse = projectId;

			if (projectUrl && !projectId) {
				const proj = await db.query.project.findFirst({
					where: eq(project.url, projectUrl),
				});
				if (!proj) {
					throw new TRPCError({
						message: "Project not found.",
						code: "NOT_FOUND",
					});
				}
				projectIdToUse = proj.id;
			}

			if (!projectIdToUse) {
				throw new TRPCError({
					message: "Project ID or URL is required.",
					code: "BAD_REQUEST",
				});
			}

			const projectWhere = eq(activity.projectId, projectIdToUse);

			const activitiesWhere = [
				projectWhere,
				categories ? inArray(activity.category, categories) : undefined,
				audiences ? inArray(activity.audience, audiences) : undefined,
				query
					? or(
						ilike(activity.name, `%${query}%`),
						ilike(activity.description, `%${query}%`),
					)
					: undefined,
			].filter(Boolean);

			let orderByClause;

			switch (sort) {
				case "desc":
					orderByClause = desc(activity.dateFrom);
					break;
				case "asc":
					orderByClause = asc(activity.dateFrom);
					break;
				case "name_asc":
					orderByClause = asc(activity.name);
					break;
				case "name_desc":
					orderByClause = desc(activity.name);
					break;
				default:
					// "recent"
					orderByClause = desc(activity.dateFrom);
			}

			// Query de atividades
			// Use the prebuilt activitiesWhere (which includes the required projectWhere)
			// so both the listing and the count use the same filters.
			const activities = await db.query.activity.findMany({
				where: and(...activitiesWhere),
				with: {
					project: true,
					speakerOnActivity: {
						with: {
							speaker: true,
						},
					},
					participantOnActivity: {
						with: {
							participant: {
								with: {
									user: true,
								},
							},
						},
					},
				},
				orderBy: orderByClause,
				offset: page ? (page - 1) * pageSize : 0,
				limit: pageSize,
			});

			// Query de contagem
			const amountDb = await db
				.select({ amount: countDistinct(activity.id) })
				.from(activity)
				.where(and(...activitiesWhere));

			const amount = amountDb[0]?.amount ?? 0;

			// console.log(activities.map(a => a.id))
			// console.log("Total activities found:", amount);

			// Since findMany returns nested data, no aggregation needed
			const formattedActivities = activities.map((act) => ({
				...act,
				participants: act.participantOnActivity.map((p) => ({
					role: p.participant.role,
					userId: p.participant.userId,
					user: {
						name: p.participant.user?.name,
						image_url: p.participant.user?.image_url,
					},
				})),
				speakers: act.speakerOnActivity.map((s) => ({
					id: s.speaker.id,
					name: s.speaker.name,
					description: s.speaker.description,
					imageUrl: s.speaker.imageUrl,
				})),
			}));

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
				speakerIds,
				participantsLimit,
				tolerance,
				workload,
				address,
				latitude,
				longitude,
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
					participantsLimit,
					tolerance,
					workload,
					address,
					latitude,
					longitude,
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

			// We add the user as a monitor by default
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

			if (speakerIds && speakerIds.length > 0) {
				await db.insert(speakerOnActivity).values(
					speakerIds.map((speakerId) => ({
						activityId: insertedActivityId,
						speakerId,
					})),
				);
			}

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
				isRegistrationOpen,
				dateFrom,
				dateTo,
				category,
				audience,
				speakerIds,
				participantsLimit,
				tolerance,
				workload,
				address,
				latitude,
				longitude,
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
						isRegistrationOpen,
						dateFrom,
						dateTo,
						category,
						audience,
						participantsLimit,
						tolerance,
						workload,
						address,
						latitude,
						longitude,
					})
					.where(eq(activity.id, activityId));

				// Update speakers
				if (speakerIds !== undefined) {
					// Delete existing
					await tx
						.delete(speakerOnActivity)
						.where(eq(speakerOnActivity.activityId, activityId));
					// Insert new
					if (speakerIds.length > 0) {
						await tx.insert(speakerOnActivity).values(
							speakerIds.map((speakerId) => ({
								activityId,
								speakerId,
							})),
						);
					}
				}
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

			const foundActivity = await db.query.activity.findFirst({
				where: eq(activity.id, activityId),
			});

			if (!foundActivity) {
				throw new TRPCError({
					message: "Activity not found.",
					code: "BAD_REQUEST",
				});
			}

			if (foundActivity.participantsLimit) {
				const currentCountResult = await db
					.select({ amount: count() })
					.from(participantOnActivity)
					.where(eq(participantOnActivity.activityId, activityId));

				const currentCount = currentCountResult?.[0]?.amount ?? 0;
				const availableSpots = foundActivity.participantsLimit - currentCount;

				if (participantsIdsToAdd.length > availableSpots) {
					throw new TRPCError({
						message: "Adding these participants exceeds the activity limit.",
						code: "BAD_REQUEST",
					});
				}
			}

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

	addMonitorsToActivity: protectedProcedure
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

			// Update roles to monitor
			await db
				.update(participant)
				.set({ role: "monitor" })
				.where(inArray(participant.id, participantsIdsToAdd));

			// Add to activity
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
