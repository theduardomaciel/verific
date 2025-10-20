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
	sum,
	gte,
	not,
	isNotNull,
	sql,
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
	page: z.coerce.number().default(1).optional(),
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
				page = 1,
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
						eq(participantOnActivity.role, "monitor"),
					),
				);

			// Buscar participantes não moderadores com paginação/filtro
			const nonMonitorWhere = [
				eq(participantOnActivity.activityId, activityId),
				eq(participantOnActivity.role, "participant"),
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
				.offset((page - 1) * pageSize)
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
					id: p.participant.id,
					role: p.role,
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
				role: "monitor",
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

			const toInsert: (typeof participantOnActivity.$inferInsert)[] = participantsIdsToAdd.map((participantId) => ({
				activityId,
				participantId,
				role: "monitor"
			}));

			// Add to activity
			await db
				.insert(participantOnActivity)
				.values(toInsert)
				.onConflictDoUpdate({
					target: [participantOnActivity.activityId, participantOnActivity.participantId],
					set: {
						role: "monitor",
					},
				});

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
	getDashboardStats: publicProcedure
		.input(z.object({ projectId: z.string().uuid() }))
		.query(async ({ input }) => {
			const { projectId } = input;

			const now = new Date();
			const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
			const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);

			// Total participants (role = 'participant')
			const totalParticipantsResult = await db
				.select({ count: countDistinct(participantOnActivity.participantId) })
				.from(participantOnActivity)
				.innerJoin(activity, eq(participantOnActivity.activityId, activity.id))
				.where(and(eq(activity.projectId, projectId), eq(participantOnActivity.role, "participant")));

			const totalParticipants = totalParticipantsResult[0]?.count ?? 0;

			// Participants in last hour
			const participantsInLastHourResult = await db
				.select({ count: countDistinct(participantOnActivity.participantId) })
				.from(participantOnActivity)
				.innerJoin(activity, eq(participantOnActivity.activityId, activity.id))
				.innerJoin(participant, eq(participantOnActivity.participantId, participant.id))
				.where(and(
					eq(activity.projectId, projectId),
					eq(participantOnActivity.role, "participant"),
					gte(participant.joinedAt, lastHour)
				));

			const participantsInLastHour = participantsInLastHourResult[0]?.count ?? 0;

			// Total workload from activities
			const totalWorkloadResult = await db
				.select({ sum: sum(activity.workload) })
				.from(activity)
				.where(eq(activity.projectId, projectId));

			const totalWorkload = totalWorkloadResult[0]?.sum ?? 0;

			// Active participants in last 24h
			const activeParticipantsResult = await db
				.select({ count: countDistinct(participantOnActivity.participantId) })
				.from(participantOnActivity)
				.innerJoin(activity, eq(participantOnActivity.activityId, activity.id))
				.innerJoin(participant, eq(participantOnActivity.participantId, participant.id))
				.where(and(
					eq(activity.projectId, projectId),
					eq(participantOnActivity.role, "participant"),
					gte(participant.joinedAt, lastDay)
				));

			const activeParticipants = activeParticipantsResult[0]?.count ?? 0;

			// Total possible enrollments (sum of participantsLimit where not null)
			const totalPossibleResult = await db
				.select({ sum: sum(activity.participantsLimit) })
				.from(activity)
				.where(and(eq(activity.projectId, projectId), isNotNull(activity.participantsLimit)));

			const totalPossible = totalPossibleResult[0]?.sum ?? 0;

			// Total enrollments (count of participantOnActivity where participantOnActivity.role = 'participant' and activity has participantsLimit)
			const totalEnrollmentsResult = await db
				.select({ count: count() })
				.from(participantOnActivity)
				.innerJoin(participant, eq(participantOnActivity.participantId, participant.id))
				.innerJoin(activity, eq(participantOnActivity.activityId, activity.id))
				.where(and(
					eq(activity.projectId, projectId),
					eq(participantOnActivity.role, "participant"),
					isNotNull(activity.participantsLimit)
				));

			const totalEnrollments = totalEnrollmentsResult[0]?.count ?? 0;

			// Calculations
			const participantsInLastHourPercentage = totalParticipants > 0 ? (participantsInLastHour / totalParticipants) * 100 : 0;
			const meanWorkloadPerParticipant = totalParticipants > 0 ? Number(totalWorkload) / totalParticipants : 0;
			const meanPercentageFromTotalWorkload = Number(totalWorkload) > 0 ? (meanWorkloadPerParticipant / Number(totalWorkload)) * 100 : 0;
			const activeParticipantsInLastDay = totalParticipants > 0 ? (activeParticipants / totalParticipants) * 100 : 0;
			const occupancyRate = Number(totalPossible) > 0 ? (totalEnrollments / Number(totalPossible)) * 100 : 0;

			// Graph data: participants per day for last 7 days
			const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			let graphDataQuery = await db
				.select({
					date: sql<string>`date(${participant.joinedAt})`,
					count: countDistinct(participantOnActivity.participantId),
				})
				.from(participantOnActivity)
				.innerJoin(activity, eq(participantOnActivity.activityId, activity.id))
				.innerJoin(participant, eq(participantOnActivity.participantId, participant.id))
				.where(and(
					eq(activity.projectId, projectId),
					eq(participantOnActivity.role, "participant"),
					gte(participant.joinedAt, sevenDaysAgo)
				))
				.groupBy(sql`date(${participant.joinedAt})`)
				.orderBy(sql`date(${participant.joinedAt})`);

			let graphData: Array<{ date: string; total: number; active: number }> = [];
			if (graphDataQuery.length > 0) {
				let cumulative = 0;
				graphData = graphDataQuery.map((row) => {
					cumulative += row.count;
					return {
						date: new Date(row.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
						total: cumulative,
						active: row.count,
					};
				});
			} else {
				// Fallback to hours for last 24 hours
				const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
				const hoursDataQuery = await db
					.select({
						hour: sql<string>`date_trunc('hour', ${participant.joinedAt})`,
						count: countDistinct(participantOnActivity.participantId),
					})
					.from(participantOnActivity)
					.innerJoin(activity, eq(participantOnActivity.activityId, activity.id))
					.innerJoin(participant, eq(participantOnActivity.participantId, participant.id))
					.where(and(
						eq(activity.projectId, projectId),
						eq(participantOnActivity.role, "participant"),
						gte(participant.joinedAt, twentyFourHoursAgo)
					))
					.groupBy(sql`date_trunc('hour', ${participant.joinedAt})`)
					.orderBy(sql`date_trunc('hour', ${participant.joinedAt})`);

				let cumulative = 0;
				graphData = hoursDataQuery.map((row) => {
					cumulative += row.count;
					const hourDate = new Date(row.hour);
					return {
						date: hourDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
						total: cumulative,
						active: row.count,
					};
				});
			}

			// Courses data
			const coursesDataQuery = await db
				.select({
					course: participant.course,
					count: countDistinct(participantOnActivity.participantId),
				})
				.from(participantOnActivity)
				.innerJoin(activity, eq(participantOnActivity.activityId, activity.id))
				.innerJoin(participant, eq(participantOnActivity.participantId, participant.id))
				.where(and(
					eq(activity.projectId, projectId),
					eq(participantOnActivity.role, "participant"),
					isNotNull(participant.course)
				))
				.groupBy(participant.course)
				.orderBy(desc(count()));

			const coursesData = coursesDataQuery.map((row) => ({
				course: row.course!,
				count: row.count,
			}));

			return {
				totalParticipants,
				participantsInLastHourPercentage,
				meanWorkloadPerParticipant,
				meanPercentageFromTotalWorkload,
				activeParticipants,
				activeParticipantsInLastDay,
				occupancyRate,
				graphData,
				coursesData,
			};
		}),
});
