import { db } from "@verific/drizzle";
import {
	activity,
	activitySession,
	sessionAttendance,
	speaker,
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
	exists,
} from "@verific/drizzle/orm";
import { z } from "@verific/zod";

// tRPC
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// Utils
import { isMemberAuthenticated } from "../auth";
import { transformSingleToArray } from "../utils";
import {
	activitySort,
	getActivitiesParams,
	getActivityParams,
} from "../schemas";

// Re-export client-safe schemas so existing server imports keep working.
// Client components must import from `@verific/api/schemas` instead.
export { activitySort, getActivitiesParams, getActivityParams };

// Enums
import { activityCategories } from "@verific/drizzle/enum/category";
import { activityAudiences } from "@verific/drizzle/enum/audience";

const activitySessionSchema = z.object({
	startsAt: z.coerce.date(),
	endsAt: z.coerce.date(),
	address: z.string().optional(),
});

const sessionsSchema = z
	.array(activitySessionSchema)
	.min(1, { message: "A atividade precisa de pelo menos uma sessão." })
	.max(30, { message: "Máximo de 30 sessões por atividade." })
	.superRefine((sessions, ctx) => {
		sessions.forEach((session, i) => {
			if (session.endsAt <= session.startsAt) {
				ctx.addIssue({
					code: "custom",
					message:
						"O término da sessão deve ser após o início.",
					path: [i, "endsAt"],
				});
			}
		});

		const sorted = [...sessions].sort(
			(a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
		);
		for (let i = 1; i < sorted.length; i++) {
			if (sorted[i]!.startsAt < sorted[i - 1]!.endsAt) {
				ctx.addIssue({
					code: "custom",
					message: "As sessões não podem se sobrepor.",
					path: [],
				});
				break;
			}
		}
	});

/** SQL expression for the earliest session start of an activity. */
const firstSessionStart = sql`(SELECT MIN(${activitySession.startsAt}) FROM ${activitySession} WHERE ${activitySession.activityId} = ${activity.id})`;

/** SQL expression matching activities with at least one session not yet ended. */
function hasUpcomingSession(now: Date = new Date()) {
	return exists(
		db
			.select({ id: activitySession.id })
			.from(activitySession)
			.where(
				and(
					eq(activitySession.activityId, activity.id),
					gte(activitySession.endsAt, now),
				),
			),
	);
}

const mutateActivityParams = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	isRegistrationOpen: z.boolean().optional(),
	sessions: sessionsSchema,
	category: z.enum(activityCategories),
	audience: z.enum(activityAudiences),
	speakerIds: z.array(z.coerce.number()).optional(),
	participantsLimit: z.coerce.number().optional(),
	address: z.string().optional(),
	latitude: z.number().optional(),
	longitude: z.number().optional(),
	tolerance: z.coerce.number().optional(),
	workload: z.coerce.number().optional(),
	projectId: z.uuid(),
});

export const activitiesRouter = createTRPCRouter({
	getActivity: publicProcedure
		.input(getActivityParams.extend({ activityId: z.uuid() }))
		.query(async ({ input, ctx }) => {
			const { activityId, page = 1, pageSize = 5, search, sort } = input;

			const userId = ctx.session?.user.id;

			const selectedActivity = await db.query.activity.findFirst({
				where(fields) {
					return eq(fields.id, activityId);
				},
				with: {
					project: true,
					sessions: {
						orderBy: asc(activitySession.startsAt),
					},
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

			let orderByClause;

			switch (sort) {
				case "asc":
					orderByClause = asc(participantOnActivity.subscribedAt);
					break;
				case "desc":
					orderByClause = desc(participantOnActivity.subscribedAt);
					break;
				case "name_asc":
					orderByClause = asc(user.name);
					break;
				case "name_desc":
					orderByClause = desc(user.name);
					break;
				default:
					// "recent"
					orderByClause = desc(participantOnActivity.subscribedAt);
			}

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
				.orderBy(orderByClause)
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
				// "joinedAt" de "participant" não seja exposto aqui
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

			// Presença por sessão: participantId -> [{ sessionId, joinedAt }]
			const attendanceRows = await db
				.select({
					sessionId: sessionAttendance.sessionId,
					participantId: sessionAttendance.participantId,
					joinedAt: sessionAttendance.joinedAt,
				})
				.from(sessionAttendance)
				.innerJoin(
					activitySession,
					eq(sessionAttendance.sessionId, activitySession.id),
				)
				.where(eq(activitySession.activityId, activityId));

			const attendanceByParticipant = new Map<
				string,
				Array<{ sessionId: string; joinedAt: Date }>
			>();
			const attendanceCountBySession = new Map<string, number>();
			for (const row of attendanceRows) {
				const list =
					attendanceByParticipant.get(row.participantId) ?? [];
				list.push({
					sessionId: row.sessionId,
					joinedAt: row.joinedAt,
				});
				attendanceByParticipant.set(row.participantId, list);
				attendanceCountBySession.set(
					row.sessionId,
					(attendanceCountBySession.get(row.sessionId) ?? 0) + 1,
				);
			}

			const participantsWithAttendance = allParticipants.map(
				(p) => ({
					...p,
					sessionAttendances:
						attendanceByParticipant.get(p.participantId) ?? [],
				}),
			);

			const sessionsWithCounts = (
				selectedActivity.sessions ?? []
			).map((session) => ({
				...session,
				attendedCount:
					attendanceCountBySession.get(session.id) ?? 0,
			}));

			const formattedActivity = {
				...selectedActivity,
				sessions: sessionsWithCounts,
				participants: participantsWithAttendance,
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
				projectId: z.uuid().optional(),
				projectUrl: z.string().optional(),
				fullQuery: z.boolean().optional(),
			}),
		)
		.query(async ({ input }) => {
			const {
				projectId,
				projectUrl,
				page = 0,
				pageSize = 5,
				query,
				sort,
				category: rawCategory,
				audience: rawAudience,
				fullQuery,
			} = input;

			const categories = rawCategory as
				| (typeof activityCategories)[number][]
				| undefined;
			const audiences = rawAudience as
				| (typeof activityAudiences)[number][]
				| undefined;

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
					orderByClause = desc(firstSessionStart);
					break;
				case "asc":
					orderByClause = asc(firstSessionStart);
					break;
				case "name_asc":
					orderByClause = asc(activity.name);
					break;
				case "name_desc":
					orderByClause = desc(activity.name);
					break;
				default:
					orderByClause = asc(firstSessionStart);
			}

			type ActivityWithRelations = typeof activity.$inferSelect & {
				participantsCount: number;
				project: typeof project.$inferSelect;
				speakerOnActivity: Array<
					typeof speakerOnActivity.$inferSelect & {
						speaker: typeof speaker.$inferSelect;
					}
				>;
				participantOnActivity?: Array<
					typeof participantOnActivity.$inferSelect & {
						participant: typeof participant.$inferSelect & {
							user: typeof user.$inferSelect;
						};
					}
				>;
			};

			// Only include participators if fullQuery is true
			const withObj = fullQuery
				? {
						project: true,
						sessions: {
							orderBy: asc(activitySession.startsAt),
						},
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
					}
				: {
						project: true,
						sessions: {
							orderBy: asc(activitySession.startsAt),
						},
						speakerOnActivity: {
							with: {
								speaker: true,
							},
						},
					};

			const activities = (await db.query.activity.findMany({
				where: and(...activitiesWhere),
				with: withObj as any,
				orderBy: orderByClause,
				offset: page ? (page - 1) * pageSize : 0,
				limit: pageSize,
			})) as ActivityWithRelations[];

			// Query de contagem
			// Get activities count and participants count per activity
			const [amountDb, participantsCounts] = await Promise.all([
				db
					.select({ amount: countDistinct(activity.id) })
					.from(activity)
					.where(and(...activitiesWhere)),
				fullQuery
					? null
					: db
							.select({
								activityId: participantOnActivity.activityId,
								count: count(),
							})
							.from(participantOnActivity)
							.innerJoin(
								activity,
								and(
									eq(
										participantOnActivity.activityId,
										activity.id,
									),
									eq(
										participantOnActivity.role,
										"participant",
									),
								),
							)
							.where(and(...activitiesWhere))
							.groupBy(participantOnActivity.activityId),
			]);

			// Map activityId to participant count
			const participantsCountMap: Record<string, number> = {};
			if (participantsCounts && Array.isArray(participantsCounts)) {
				for (const row of participantsCounts) {
					participantsCountMap[row.activityId] = row.count;
				}
			}

			const formattedActivities = activities.map(
				(act: ActivityWithRelations) => ({
					...act,
					participantsCount: participantsCountMap[act.id] ?? 0,
					participants: act.participantOnActivity
						? act.participantOnActivity.map(
								(
									p: NonNullable<
										ActivityWithRelations["participantOnActivity"]
									>[0],
								) => ({
									id: p.participant.id,
									role: p.role,
									userId: p.participant.userId,
									user: {
										name: p.participant.user?.name,
										image_url:
											p.participant.user?.image_url,
									},
								}),
							)
						: [],
					speakers: act.speakerOnActivity
						? act.speakerOnActivity.map(
								(
									s: ActivityWithRelations["speakerOnActivity"][0],
								) => ({
									id: s.speaker.id,
									name: s.speaker.name,
									description: s.speaker.description,
									imageUrl: s.speaker.imageUrl,
								}),
							)
						: [],
				}),
			);

			const amount = amountDb[0]?.amount ?? 0;
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
				sessions,
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

			const insertedActivityId = await db.transaction(async (tx) => {
				const inserted = await tx
					.insert(activity)
					.values({
						name,
						description,
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

				const activityId = inserted[0]?.id;

				if (!activityId) {
					throw new TRPCError({
						message: "Failed to create activity.",
						code: "INTERNAL_SERVER_ERROR",
					});
				}

				await tx.insert(activitySession).values(
					sessions.map((session) => ({
						activityId,
						startsAt: session.startsAt,
						endsAt: session.endsAt,
						address: session.address,
					})),
				);

				return activityId;
			});

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
				activityId: z.uuid(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const {
				activityId,
				name,
				description,
				isRegistrationOpen,
				sessions,
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

				// Replace sessions (attendance rows cascade-delete with them)
				if (sessions !== undefined) {
					await tx
						.delete(activitySession)
						.where(eq(activitySession.activityId, activityId));
					await tx.insert(activitySession).values(
						sessions.map((session) => ({
							activityId,
							startsAt: session.startsAt,
							endsAt: session.endsAt,
							address: session.address,
						})),
					);
				}

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
				activityId: z.uuid(),
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

			if (!foundActivity.isRegistrationOpen) {
				throw new TRPCError({
					message: "Activity registration is closed.",
					code: "BAD_REQUEST",
				});
			}

			const projectParticipants = await db
				.select({ id: participant.id })
				.from(participant)
				.where(
					and(
						eq(participant.projectId, foundActivity.projectId),
						inArray(participant.id, participantsIdsToAdd),
					),
				);

			if (projectParticipants.length !== participantsIdsToAdd.length) {
				throw new TRPCError({
					message:
						"Participants must belong to the activity project.",
					code: "FORBIDDEN",
				});
			}

			if (foundActivity.participantsLimit) {
				const currentCountResult = await db
					.select({ amount: count() })
					.from(participantOnActivity)
					.where(
						and(
							eq(participantOnActivity.activityId, activityId),
							eq(participantOnActivity.role, "participant"),
						),
					);

				const currentCount = currentCountResult?.[0]?.amount ?? 0;
				const availableSpots =
					foundActivity.participantsLimit - currentCount;

				if (participantsIdsToAdd.length > availableSpots) {
					throw new TRPCError({
						message:
							"Adding these participants exceeds the activity limit.",
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

			const toInsert: (typeof participantOnActivity.$inferInsert)[] =
				participantsIdsToAdd.map((participantId) => ({
					activityId,
					participantId,
					role: "monitor",
				}));

			// Add to activity
			await db
				.insert(participantOnActivity)
				.values(toInsert)
				.onConflictDoUpdate({
					target: [
						participantOnActivity.activityId,
						participantOnActivity.participantId,
					],
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
				.select({
					count: countDistinct(participantOnActivity.participantId),
				})
				.from(participantOnActivity)
				.innerJoin(
					activity,
					eq(participantOnActivity.activityId, activity.id),
				)
				.where(
					and(
						eq(activity.projectId, projectId),
						eq(participantOnActivity.role, "participant"),
					),
				);

			const totalParticipants = totalParticipantsResult[0]?.count ?? 0;

			// Participants in last hour
			const participantsInLastHourResult = await db
				.select({
					count: countDistinct(participantOnActivity.participantId),
				})
				.from(participantOnActivity)
				.innerJoin(
					activity,
					eq(participantOnActivity.activityId, activity.id),
				)
				.innerJoin(
					participant,
					eq(participantOnActivity.participantId, participant.id),
				)
				.where(
					and(
						eq(activity.projectId, projectId),
						eq(participantOnActivity.role, "participant"),
						gte(participant.joinedAt, lastHour),
					),
				);

			const participantsInLastHour =
				participantsInLastHourResult[0]?.count ?? 0;

			// Total workload from activities
			const totalWorkloadResult = await db
				.select({ sum: sum(activity.workload) })
				.from(activity)
				.where(eq(activity.projectId, projectId));

			const totalWorkload = totalWorkloadResult[0]?.sum ?? 0;

			// Active participants in last 24h
			const activeParticipantsResult = await db
				.select({
					count: countDistinct(participantOnActivity.participantId),
				})
				.from(participantOnActivity)
				.innerJoin(
					activity,
					eq(participantOnActivity.activityId, activity.id),
				)
				.innerJoin(
					participant,
					eq(participantOnActivity.participantId, participant.id),
				)
				.where(
					and(
						eq(activity.projectId, projectId),
						eq(participantOnActivity.role, "participant"),
						gte(participant.joinedAt, lastDay),
					),
				);

			const activeParticipants = activeParticipantsResult[0]?.count ?? 0;

			// Total possible enrollments (sum of participantsLimit where not null)
			const totalPossibleResult = await db
				.select({ sum: sum(activity.participantsLimit) })
				.from(activity)
				.where(
					and(
						eq(activity.projectId, projectId),
						isNotNull(activity.participantsLimit),
					),
				);

			const totalPossible = totalPossibleResult[0]?.sum ?? 0;

			// Total enrollments (count of participantOnActivity where participantOnActivity.role = 'participant' and activity has participantsLimit)
			const totalEnrollmentsResult = await db
				.select({ count: count() })
				.from(participantOnActivity)
				.innerJoin(
					participant,
					eq(participantOnActivity.participantId, participant.id),
				)
				.innerJoin(
					activity,
					eq(participantOnActivity.activityId, activity.id),
				)
				.where(
					and(
						eq(activity.projectId, projectId),
						eq(participantOnActivity.role, "participant"),
						isNotNull(activity.participantsLimit),
					),
				);

			const totalEnrollments = totalEnrollmentsResult[0]?.count ?? 0;

			// Calculations
			const participantsInLastHourPercentage =
				totalParticipants > 0
					? (participantsInLastHour / totalParticipants) * 100
					: 0;
			const meanWorkloadPerParticipant =
				totalParticipants > 0
					? Number(totalWorkload) / totalParticipants
					: 0;
			const meanPercentageFromTotalWorkload =
				Number(totalWorkload) > 0
					? (meanWorkloadPerParticipant / Number(totalWorkload)) * 100
					: 0;
			const activeParticipantsInLastDay =
				totalParticipants > 0
					? (activeParticipants / totalParticipants) * 100
					: 0;
			const occupancyRate =
				Number(totalPossible) > 0
					? (totalEnrollments / Number(totalPossible)) * 100
					: 0;

			// Graph data: participants per day for last 7 days
			const sevenDaysAgo = new Date(
				now.getTime() - 7 * 24 * 60 * 60 * 1000,
			);
			let graphDataQuery = await db
				.select({
					date: sql<string>`date(${participant.joinedAt})`,
					count: countDistinct(participantOnActivity.participantId),
				})
				.from(participantOnActivity)
				.innerJoin(
					activity,
					eq(participantOnActivity.activityId, activity.id),
				)
				.innerJoin(
					participant,
					eq(participantOnActivity.participantId, participant.id),
				)
				.where(
					and(
						eq(activity.projectId, projectId),
						eq(participantOnActivity.role, "participant"),
						gte(participant.joinedAt, sevenDaysAgo),
					),
				)
				.groupBy(sql`date(${participant.joinedAt})`)
				.orderBy(sql`date(${participant.joinedAt})`);

			let graphData: Array<{
				date: string;
				total: number;
				active: number;
			}> = [];
			if (graphDataQuery.length > 0) {
				let cumulative = 0;
				graphData = graphDataQuery.map((row) => {
					cumulative += row.count;
					return {
						date: new Date(row.date).toLocaleDateString("pt-BR", {
							month: "short",
							day: "numeric",
						}),
						total: cumulative,
						active: row.count,
					};
				});
			} else {
				// Fallback to hours for last 24 hours
				const twentyFourHoursAgo = new Date(
					now.getTime() - 24 * 60 * 60 * 1000,
				);
				const hoursDataQuery = await db
					.select({
						hour: sql<string>`date_trunc('hour', ${participant.joinedAt})`,
						count: countDistinct(
							participantOnActivity.participantId,
						),
					})
					.from(participantOnActivity)
					.innerJoin(
						activity,
						eq(participantOnActivity.activityId, activity.id),
					)
					.innerJoin(
						participant,
						eq(participantOnActivity.participantId, participant.id),
					)
					.where(
						and(
							eq(activity.projectId, projectId),
							eq(participantOnActivity.role, "participant"),
							gte(participant.joinedAt, twentyFourHoursAgo),
						),
					)
					.groupBy(sql`date_trunc('hour', ${participant.joinedAt})`)
					.orderBy(sql`date_trunc('hour', ${participant.joinedAt})`);

				let cumulative = 0;
				graphData = hoursDataQuery.map((row) => {
					cumulative += row.count;
					const hourDate = new Date(row.hour);
					return {
						date: hourDate.toLocaleTimeString("pt-BR", {
							hour: "2-digit",
							minute: "2-digit",
						}),
						total: cumulative,
						active: row.count,
					};
				});
			}

			return {
				totalParticipants,
				participantsInLastHourPercentage,
				meanWorkloadPerParticipant,
				meanPercentageFromTotalWorkload,
				activeParticipants,
				activeParticipantsInLastDay,
				occupancyRate,
				graphData,
				coursesData: [] as Array<{ course: string; count: number }>,
			};
		}),
	getReleasableActivities: protectedProcedure
		.input(z.object({ projectId: z.uuid() }))
		.query(async ({ input, ctx }) => {
			const error = await isMemberAuthenticated({
				userId: ctx.session.user.id,
			});
			if (error) throw new TRPCError(error);

			// Closed registrations, and not yet ended
			const rows = await db.query.activity.findMany({
				where: and(
					eq(activity.projectId, input.projectId),
					eq(activity.isRegistrationOpen, false),
					hasUpcomingSession(),
				),
				with: {
					sessions: {
						orderBy: asc(activitySession.startsAt),
					},
					tagOnActivity: {
						with: { tag: true },
					},
				},
				orderBy: asc(firstSessionStart),
			});

			return rows.map((row) => ({
				id: row.id,
				name: row.name,
				sessions: row.sessions.map((session) => ({
					startsAt: session.startsAt,
					endsAt: session.endsAt,
				})),
				category: row.category,
				participantsLimit: row.participantsLimit,
				tags: row.tagOnActivity.map((t) => ({
					id: t.tag.id,
					name: t.tag.name,
				})),
			}));
		}),

	setActivitiesRegistration: protectedProcedure
		.input(
			z.object({
				projectId: z.uuid(),
				activityIds: z.array(z.uuid()).min(1).max(200),
				isRegistrationOpen: z.boolean(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { projectId, isRegistrationOpen } = input;
			const activityIds = [...new Set(input.activityIds)];

			const error = await isMemberAuthenticated({
				userId: ctx.session.user.id,
			});
			if (error) throw new TRPCError(error);

			await db.transaction(async (tx) => {
				const updated = await tx
					.update(activity)
					.set({ isRegistrationOpen })
					.where(
						and(
							eq(activity.projectId, projectId),
							inArray(activity.id, activityIds),
						),
					)
					.returning({ id: activity.id });

				// Every id must belong to this project; otherwise roll everything back
				if (updated.length !== activityIds.length) {
					throw new TRPCError({
						message:
							"Some activities were not found in this project.",
						code: "BAD_REQUEST",
					});
				}
			});

			return { updatedCount: activityIds.length };
		}),
});
