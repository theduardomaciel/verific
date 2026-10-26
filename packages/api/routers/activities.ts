import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
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
	lte,
	isNotNull,
	isNull,
	sql,
	exists,
	min,
	type AnyColumn,
} from "@verific/drizzle/orm";
import {
	activity,
	activitySession,
	activityWaitlist,
	activityWaitlistEvent,
	formAnswer,
	formField,
	formVersion,
	sessionAttendance,
	speaker,
	speakerOnActivity,
	participant,
	participantOnActivity,
	project,
	tag,
	tagOnActivity,
	user,
} from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import {
	assertNoScheduleConflict,
	lockParticipant,
	persistEnrollment,
	prepareActivityAnswers,
} from "../enrollment";
import {
	hasProjectAccess,
	requireActivityAccess,
	requireParticipantsInProject,
	requireProjectAccess,
} from "../lib/project-access";
import { planSessionDiff } from "../lib/session-diff";
import {
	loadActivityAudience,
	loadNotificationRecipients,
	notifyActivityCancelled,
	notifyActivityEnrollmentConfirmed,
	notifyActivityUpdated,
	notifyActivityWaitlistPromoted,
} from "../notifications";
import {
	activitySort,
	getActivitiesParams,
	getActivityParams,
	answerValueSchema,
	BREAKDOWN_FIELD_TYPES,
	BREAKDOWN_MAX_SERIES,
	BREAKDOWN_OTHER_SERIES,
	BREAKDOWN_REGISTRATIONS_SERIES,
	BREAKDOWN_TIME_WINDOWS,
} from "../schemas";
import {
	assertActivityOpen,
	assertSeatsAvailable,
	lockActivity,
	openOfferWhere,
} from "../seats";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { transformSingleToArray } from "../utils";
import {
	closeEntry,
	resolveEnrolledEntries,
	settleActivity,
} from "../waitlist";
import { seatsTaken } from "../waitlist-plan";
import { hasPublishedActivityForm } from "./forms";

// Re-export client-safe schemas so existing server imports keep working.
// Client components must import from `@verific/api/schemas` instead.
export { activitySort, getActivitiesParams, getActivityParams };

import { activityAudiences } from "@verific/drizzle/enum/audience";
import { activityCategories } from "@verific/drizzle/enum/category";

const activitySessionSchema = z.object({
	/** Id de uma sessão já existente (omisso quando é nova). */
	id: z.uuid().optional(),
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
					message: "O término da sessão deve ser após o início.",
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

type ActivityTable = typeof activity;

/**
 * Column-only types for the correlated helpers.
 *
 * A relational-query callback (`(table) => ...`) hands you a plain object of
 * columns, not the table (no `$inferSelect`/`getSQL`/etc.), so the helpers
 * cannot take `typeof activity`. These `Pick`s derive the exact columns each
 * helper reads from the schema, which is the single source of truth:
 * - adding a column to `activities` never affects them;
 * - removing a referenced column fails to compile here (intended);
 * - a helper that starts reading a new column must widen its own `Pick`.
 */
type ActivityRef = Pick<ActivityTable, "id">;
type ActivityFilterColumns = Pick<
	ActivityTable,
	| "id"
	| "projectId"
	| "category"
	| "audience"
	| "name"
	| "description"
	| "cancelledAt"
>;

/**
 * Correlated helpers.
 *
 * They take the *table columns* as an argument so the caller can pass the
 * correctly aliased table from a relational-query callback (`(table) => ...`).
 * A relational query aliases the root table to its schema key (`"activity"`),
 * while plain `db.select()` uses the SQL name (`"activities"`); building the
 * subquery from whatever table the current query actually uses keeps both
 * correct and avoids hand-written raw SQL.
 */
function firstSessionStart(table: ActivityRef) {
	return db
		.select({ value: min(activitySession.startsAt) })
		.from(activitySession)
		.where(eq(activitySession.activityId, table.id));
}

/** Matches activities with at least one session not yet ended. */
function hasUpcomingSession(table: ActivityRef, now: Date = new Date()) {
	return exists(
		db
			.select({ id: activitySession.id })
			.from(activitySession)
			.where(
				and(
					eq(activitySession.activityId, table.id),
					gte(activitySession.endsAt, now),
				),
			),
	);
}

/** Matches activities that have at least one of `tagIds`. */
function hasAnyTag(table: ActivityRef, tagIds: string[]) {
	return exists(
		db
			.select({ id: tagOnActivity.activityId })
			.from(tagOnActivity)
			.where(
				and(
					eq(tagOnActivity.activityId, table.id),
					inArray(tagOnActivity.tagId, tagIds),
				),
			),
	);
}

/**
 * Builds the shared activity filter for a given (possibly aliased) table.
 * Used by the relation query and by the plain count queries so both get
 * correctly-qualified subqueries.
 */
function buildActivitiesWhere(
	table: ActivityFilterColumns,
	opts: {
		projectId: string;
		categories?: (typeof activityCategories)[number][] | undefined;
		audiences?: (typeof activityAudiences)[number][] | undefined;
		tagIds?: string[] | undefined;
		query?: string | undefined;
	},
) {
	return and(
		eq(table.projectId, opts.projectId),
		// Canceladas somem das listas (soft-cancel mantém os registros).
		isNull(table.cancelledAt),
		opts.categories ? inArray(table.category, opts.categories) : undefined,
		opts.audiences ? inArray(table.audience, opts.audiences) : undefined,
		opts.tagIds && opts.tagIds.length > 0
			? hasAnyTag(table, opts.tagIds)
			: undefined,
		opts.query
			? or(
					ilike(table.name, `%${opts.query}%`),
					ilike(table.description, `%${opts.query}%`),
				)
			: undefined,
	);
}

interface SessionSnapshot {
	startsAt: Date | string;
	endsAt: Date | string;
	address?: string | null;
}

function sessionsEquivalent(
	before: SessionSnapshot[],
	next: SessionSnapshot[],
): boolean {
	const normalize = (sessions: SessionSnapshot[]) =>
		sessions
			.map((session) => ({
				start: new Date(session.startsAt).getTime(),
				end: new Date(session.endsAt).getTime(),
				address: session.address?.trim() ?? "",
			}))
			.sort(
				(a, b) =>
					a.start - b.start ||
					a.end - b.end ||
					a.address.localeCompare(b.address),
			);
	const a = normalize(before);
	const b = normalize(next);
	return (
		a.length === b.length &&
		a.every(
			(entry, index) =>
				entry.start === b[index]!.start &&
				entry.end === b[index]!.end &&
				entry.address === b[index]!.address,
		)
	);
}

/**
 * Pure change detector for `updateActivity`: the e-mail only goes out when
 * date/time (sessions) or location (address) actually change. Returns the
 * pt-BR summary shown in the e-mail, or null when nothing relevant changed.
 */
export function describeActivityChanges(args: {
	beforeSessions: SessionSnapshot[];
	beforeAddress: string | null;
	nextSessions?: SessionSnapshot[] | undefined;
	/** `undefined` = address not sent; `""`/null = cleared. */
	nextAddress?: string | null | undefined;
}): string | null {
	const dateChanged =
		args.nextSessions !== undefined &&
		!sessionsEquivalent(args.beforeSessions, args.nextSessions);
	const locationChanged =
		args.nextAddress !== undefined &&
		(args.nextAddress?.trim() ?? "") !== (args.beforeAddress?.trim() ?? "");
	if (dateChanged && locationChanged) return "Data, horário e local";
	if (dateChanged) return "Data e horário";
	if (locationChanged) return "Local";
	return null;
}

const mutateActivityParams = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	isRegistrationOpen: z.boolean().optional(),
	sessions: sessionsSchema,
	tagIds: z.array(z.uuid()).max(5).optional(),
	category: z.enum(activityCategories),
	audience: z.enum(activityAudiences),
	// Repetido violaria a chave de `speaker_activities`
	speakerIds: z
		.array(z.coerce.number())
		.transform((ids) => [...new Set(ids)])
		.optional(),
	// `null` remove o limite; `undefined` mantém o atual
	participantsLimit: z.number().int().min(1).nullable().optional(),
	address: z.string().optional(),
	latitude: z.number().optional(),
	longitude: z.number().optional(),
	tolerance: z.coerce.number().int().min(5).max(240).nullable().optional(),
	workload: z.coerce.number().min(0).optional(),
	allowOverlap: z.boolean().optional(),
	waitlistEnabled: z.boolean().optional(),
	waitlistOfferHours: z.coerce.number().int().min(1).max(168).optional(),
	projectId: z.uuid(),
});

/** Replaces the tag links of an activity. Tags must belong to the project. */
async function setActivityTags(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	activityId: string,
	tagIds: string[],
	projectId: string,
) {
	const uniqueTagIds = [...new Set(tagIds)];

	await tx
		.delete(tagOnActivity)
		.where(eq(tagOnActivity.activityId, activityId));

	if (uniqueTagIds.length === 0) return;

	const rows = await tx
		.select({ id: tag.id })
		.from(tag)
		.where(
			and(eq(tag.projectId, projectId), inArray(tag.id, uniqueTagIds)),
		);

	if (rows.length !== uniqueTagIds.length) {
		throw new TRPCError({
			message: "Algumas trilhas não pertencem a este evento.",
			code: "BAD_REQUEST",
		});
	}

	await tx.insert(tagOnActivity).values(
		uniqueTagIds.map((tagId) => ({
			activityId,
			tagId,
		})),
	);
}

/** Um id repetido contaria duas vezes nas vagas e nas respostas. */
function toUniqueIds(value: string | string[]) {
	const ids = transformSingleToArray(value);
	return ids && [...new Set(ids)];
}

async function assertSpeakersInProject(
	speakerIds: number[],
	projectId: string,
) {
	if (speakerIds.length === 0) return;

	const rows = await db
		.select({ id: speaker.id })
		.from(speaker)
		.where(
			and(
				eq(speaker.projectId, projectId),
				inArray(speaker.id, speakerIds),
			),
		);

	if (rows.length !== speakerIds.length) {
		throw new TRPCError({
			message: "Alguns palestrantes não pertencem a este evento.",
			code: "BAD_REQUEST",
		});
	}
}

/**
 * Início do dia ou da hora em Brasília. As colunas guardam UTC sem fuso, e o
 * resultado volta como texto ("2026-10-20 21:00:00").
 */
function localTrunc(unit: "hour" | "day", column: AnyColumn) {
	return sql<string>`date_trunc(${sql.raw(`'${unit}'`)}, (${column} at time zone 'UTC') at time zone 'America/Sao_Paulo')`;
}

/** Rótulo de um intervalo de `localTrunc`, sem depender do fuso do servidor. */
function formatLocalBucket(raw: string, unit: "hour" | "day") {
	const date = new Date(`${raw.replace(" ", "T")}Z`);
	return unit === "hour"
		? date.toLocaleTimeString("pt-BR", {
				timeZone: "UTC",
				hour: "2-digit",
				minute: "2-digit",
			})
		: date.toLocaleDateString("pt-BR", {
				timeZone: "UTC",
				month: "short",
				day: "numeric",
			});
}

/**
 * Public speaker shape: strips the organizer-entered `email` (linking
 * intent, never public) and flattens the resolved profile link.
 */
function toPublicSpeaker<
	T extends {
		email?: string | null;
		linkedParticipant?: { shortId: string } | null;
	},
>(row: T) {
	const { email: _email, linkedParticipant, ...rest } = row;
	return {
		...rest,
		profileShortId: linkedParticipant?.shortId ?? null,
	};
}

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
							speaker: {
								with: {
									linkedParticipant: {
										columns: { id: true, shortId: true },
									},
								},
							},
						},
					},
					tagOnActivity: {
						with: {
							tag: true,
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

			// Sem acesso de organizador, só a atividade básica: a lista de
			// inscritos traz e-mails e presenças.
			// A contagem de ocupantes viaja junto: antes a página de detalhe
			// chamava `getActivities` (lista inteira do evento) só para achar
			// esse número no primeiro render de cada atividade.
			const canManage = userId
				? await hasProjectAccess(selectedActivity.projectId, userId)
				: false;
			if (!canManage) {
				const [hasForm, participantsAmount, queueRows] =
					await Promise.all([
						hasPublishedActivityForm(
							selectedActivity.projectId,
							activityId,
						),
						db
							.select({ amount: count() })
							.from(participantOnActivity)
							.where(
								and(
									eq(
										participantOnActivity.activityId,
										activityId,
									),
									eq(
										participantOnActivity.role,
										"participant",
									),
								),
							),
						db
							.select({
								status: activityWaitlist.status,
								amount: count(),
							})
							.from(activityWaitlist)
							.where(
								and(
									eq(activityWaitlist.activityId, activityId),
									or(
										eq(activityWaitlist.status, "waiting"),
										openOfferWhere(),
									),
								),
							)
							.groupBy(activityWaitlist.status),
					]);
				const queueAmount = (status: "waiting" | "offered") =>
					queueRows.find((row) => row.status === status)?.amount ?? 0;

				return {
					activity: {
						...selectedActivity,
						speakerOnActivity: (
							selectedActivity.speakerOnActivity ?? []
						).map((s) => ({
							...s,
							speaker: toPublicSpeaker(s.speaker),
						})),
						tags: (selectedActivity.tagOnActivity ?? []).map(
							(t) => t.tag,
						),
						form: null,
						hasForm,
						participants: [],
						participantsAmount: seatsTaken({
							limit: selectedActivity.participantsLimit,
							enrolled: participantsAmount[0]?.amount ?? 0,
							openOffers: queueAmount("offered"),
							waiting: queueAmount("waiting"),
						}),
					},
					pageCount: 0,
					participantId: null,
				};
			}

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
				const { joinedAt: _joinedAt, ...rest } = row.participant;

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

			const participantsWithAttendance = allParticipants.map((p) => ({
				...p,
				sessionAttendances:
					attendanceByParticipant.get(p.participantId) ?? [],
			}));

			const sessionsWithCounts = (selectedActivity.sessions ?? []).map(
				(session) => ({
					...session,
					attendedCount:
						attendanceCountBySession.get(session.id) ?? 0,
				}),
			);

			const formattedActivity = {
				...selectedActivity,
				speakerOnActivity: (
					selectedActivity.speakerOnActivity ?? []
				).map((s) => ({
					...s,
					speaker: toPublicSpeaker(s.speaker),
				})),
				sessions: sessionsWithCounts,
				tags: (selectedActivity.tagOnActivity ?? []).map((t) => t.tag),
				participants: participantsWithAttendance,
			};

			const latestFormVersion = await db.query.formVersion.findFirst({
				where: and(
					eq(formVersion.projectId, selectedActivity.projectId),
					eq(formVersion.activityId, activityId),
				),
				orderBy: desc(formVersion.version),
			});
			let formSummary: {
				versionId: string;
				version: number;
				isPublished: boolean;
				fieldsCount: number;
			} | null = null;
			if (latestFormVersion) {
				const fieldsCountResult = await db
					.select({ amount: count() })
					.from(formField)
					.where(
						and(
							eq(formField.formVersionId, latestFormVersion.id),
							eq(formField.isActive, true),
						),
					);
				formSummary = {
					versionId: latestFormVersion.id,
					version: latestFormVersion.version,
					isPublished: latestFormVersion.isPublished,
					fieldsCount: fieldsCountResult?.[0]?.amount ?? 0,
				};
			}

			return {
				activity: {
					...formattedActivity,
					form: formSummary,
					hasForm: await hasPublishedActivityForm(
						selectedActivity.projectId,
						activityId,
					),
				},
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
				tagIds: z.array(z.uuid()).optional(),
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
				fullQuery,
				tagIds,
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

			// A lista com os inscritos é do dashboard
			if (fullQuery) {
				const userId = ctx.session?.user.id;
				if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });
				await requireProjectAccess(projectIdToUse, userId);
			}

			const filterOpts = {
				projectId: projectIdToUse,
				categories,
				audiences,
				tagIds,
				query,
			} as const;

			type ActivityWithRelations = typeof activity.$inferSelect & {
				participantsCount: number;
				project: Pick<typeof project.$inferSelect, "id" | "url">;
				sessions: Array<typeof activitySession.$inferSelect>;
				speakerOnActivity: Array<
					typeof speakerOnActivity.$inferSelect & {
						speaker: typeof speaker.$inferSelect & {
							linkedParticipant?: {
								id: string;
								shortId: string;
							} | null;
						};
					}
				>;
				tagOnActivity: Array<
					typeof tagOnActivity.$inferSelect & {
						tag: typeof tag.$inferSelect;
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
						// Os consumidores só usam a URL; o resto do projeto pesa no cache
						project: { columns: { id: true, url: true } },
						sessions: {
							orderBy: asc(activitySession.startsAt),
						},
						speakerOnActivity: {
							with: {
								speaker: {
									with: {
										linkedParticipant: {
											columns: {
												id: true,
												shortId: true,
											},
										},
									},
								},
							},
						},
						tagOnActivity: {
							with: {
								tag: true,
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
						project: { columns: { id: true, url: true } },
						sessions: {
							orderBy: asc(activitySession.startsAt),
						},
						speakerOnActivity: {
							with: {
								speaker: {
									with: {
										linkedParticipant: {
											columns: {
												id: true,
												shortId: true,
											},
										},
									},
								},
							},
						},
						tagOnActivity: {
							with: {
								tag: true,
							},
						},
					};

			const activities = (await db.query.activity.findMany({
				where: (table) => buildActivitiesWhere(table, filterOpts),
				with: withObj as any,
				orderBy: (table, { asc: _asc, desc: _desc }) => {
					switch (sort) {
						case "desc":
							return _desc(firstSessionStart(table));
						case "asc":
							return _asc(firstSessionStart(table));
						case "name_asc":
							return _asc(table.name);
						case "name_desc":
							return _desc(table.name);
						default:
							return _asc(firstSessionStart(table));
					}
				},
				offset: page ? (page - 1) * pageSize : 0,
				limit: pageSize,
			})) as ActivityWithRelations[];

			// Query de contagem
			// Get activities count and participants count per activity
			const [amountDb, participantsCounts, queueCounts] =
				await Promise.all([
					db
						.select({ amount: countDistinct(activity.id) })
						.from(activity)
						.where(buildActivitiesWhere(activity, filterOpts)),
					fullQuery
						? null
						: db
								.select({
									activityId:
										participantOnActivity.activityId,
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
								.where(
									buildActivitiesWhere(activity, filterOpts),
								)
								.groupBy(participantOnActivity.activityId),
					fullQuery
						? null
						: db
								.select({
									activityId: activityWaitlist.activityId,
									status: activityWaitlist.status,
									count: count(),
								})
								.from(activityWaitlist)
								.innerJoin(
									activity,
									and(
										eq(
											activityWaitlist.activityId,
											activity.id,
										),
										or(
											eq(
												activityWaitlist.status,
												"waiting",
											),
											openOfferWhere(),
										),
									),
								)
								.where(
									buildActivitiesWhere(activity, filterOpts),
								)
								.groupBy(
									activityWaitlist.activityId,
									activityWaitlist.status,
								),
				]);

			// Map activityId to participant count
			const participantsCountMap: Record<string, number> = {};
			if (participantsCounts && Array.isArray(participantsCounts)) {
				for (const row of participantsCounts) {
					participantsCountMap[row.activityId] = row.count;
				}
			}
			const offeredCountMap = new Map<string, number>();
			const waitingCountMap = new Map<string, number>();
			for (const row of queueCounts ?? []) {
				(row.status === "offered"
					? offeredCountMap
					: waitingCountMap
				).set(row.activityId, row.count);
			}

			// `hasForm` por atividade: existe versão publicada no escopo da
			// atividade com ao menos um campo visível e ativo. Duas queries
			// agregadas (não por card): versões publicadas do projeto +
			// contagem de campos por versão, vencendo a mais recente.
			const hasFormByActivity = new Map<string, boolean>();
			if (projectIdToUse) {
				const activityIds = activities.map((act) => act.id);
				if (activityIds.length > 0) {
					const publishedVersions =
						await db.query.formVersion.findMany({
							where: and(
								eq(formVersion.projectId, projectIdToUse),
								inArray(formVersion.activityId, activityIds),
								eq(formVersion.isPublished, true),
							),
							columns: {
								id: true,
								activityId: true,
								version: true,
							},
						});
					const versionIds = publishedVersions.map((v) => v.id);
					const fieldCounts =
						versionIds.length > 0
							? await db
									.select({
										versionId: formField.formVersionId,
										amount: count(),
									})
									.from(formField)
									.where(
										and(
											inArray(
												formField.formVersionId,
												versionIds,
											),
											eq(formField.isActive, true),
											eq(formField.isVisible, true),
										),
									)
									.groupBy(formField.formVersionId)
							: [];
					const countByVersion = new Map(
						fieldCounts.map((row) => [row.versionId, row.amount]),
					);
					const latestByActivity = new Map<
						string,
						{ id: string; version: number }
					>();
					for (const v of publishedVersions) {
						if (!v.activityId) continue;
						const current = latestByActivity.get(v.activityId);
						if (!current || v.version > current.version) {
							latestByActivity.set(v.activityId, {
								id: v.id,
								version: v.version,
							});
						}
					}
					for (const [activityId, latest] of latestByActivity) {
						hasFormByActivity.set(
							activityId,
							(countByVersion.get(latest.id) ?? 0) > 0,
						);
					}
				}
			}

			const formattedActivities = activities.map(
				({
					participantOnActivity: enrollments,
					...act
				}: ActivityWithRelations) => ({
					...act,
					speakerOnActivity: act.speakerOnActivity.map((s) => ({
						...s,
						speaker: toPublicSpeaker(s.speaker),
					})),
					participantsCount: seatsTaken({
						limit: act.participantsLimit,
						enrolled: participantsCountMap[act.id] ?? 0,
						openOffers: offeredCountMap.get(act.id) ?? 0,
						waiting: waitingCountMap.get(act.id) ?? 0,
					}),
					hasForm: hasFormByActivity.get(act.id) ?? false,
					tags: (act.tagOnActivity ?? []).map((t) => t.tag),
					participants: enrollments
						? enrollments.map(
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
									title: s.speaker.title,
									description: s.speaker.description,
									imageUrl: s.speaker.imageUrl,
									socials: s.speaker.socials ?? [],
									participantId: s.speaker.participantId,
									profileShortId:
										s.speaker.linkedParticipant?.shortId ??
										null,
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
				amount,
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
				tagIds,
				category,
				audience,
				speakerIds,
				participantsLimit,
				tolerance,
				workload,
				allowOverlap,
				waitlistEnabled,
				waitlistOfferHours,
				address,
				latitude,
				longitude,
				projectId,
			} = input;

			await requireProjectAccess(projectId, userId);
			if (speakerIds)
				await assertSpeakersInProject(speakerIds, projectId);

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
						allowOverlap,
						waitlistEnabled,
						waitlistOfferHours,
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

				if (tagIds !== undefined) {
					await setActivityTags(tx, activityId, tagIds, projectId);
				}

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
				tagIds,
				category,
				audience,
				speakerIds,
				participantsLimit,
				tolerance,
				workload,
				allowOverlap,
				waitlistEnabled,
				waitlistOfferHours,
				address,
				latitude,
				longitude,
			} = input;

			const existing = await db.query.activity.findFirst({
				where: eq(activity.id, activityId),
				columns: { projectId: true, address: true },
				with: {
					sessions: {
						columns: {
							id: true,
							startsAt: true,
							endsAt: true,
							address: true,
						},
					},
				},
			});

			if (!existing) {
				throw new TRPCError({
					message: "Activity not found.",
					code: "NOT_FOUND",
				});
			}

			await requireProjectAccess(existing.projectId, ctx.session.user.id);
			if (speakerIds) {
				await assertSpeakersInProject(speakerIds, existing.projectId);
			}

			await db.transaction(async (tx) => {
				await lockActivity(tx, activityId);

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
						allowOverlap,
						waitlistEnabled,
						waitlistOfferHours,
						address,
						latitude,
						longitude,
					})
					.where(eq(activity.id, activityId));

				// Atualiza as sessões por id. Recriar a lista apagava as
				// presenças em cascata e deixava os pontos órfãos.
				if (sessions !== undefined) {
					const currentSessions = await tx
						.select({
							id: activitySession.id,
							startsAt: activitySession.startsAt,
							endsAt: activitySession.endsAt,
							address: activitySession.address,
						})
						.from(activitySession)
						.where(eq(activitySession.activityId, activityId));

					const plan = planSessionDiff(currentSessions, sessions);

					for (const session of plan.toUpdate) {
						await tx
							.update(activitySession)
							.set({
								startsAt: session.startsAt,
								endsAt: session.endsAt,
								address: session.address,
							})
							.where(eq(activitySession.id, session.id));
					}

					if (plan.toDeleteIds.length > 0) {
						await tx
							.delete(activitySession)
							.where(
								inArray(activitySession.id, plan.toDeleteIds),
							);
					}

					if (plan.toInsert.length > 0) {
						await tx.insert(activitySession).values(
							plan.toInsert.map((session) => ({
								activityId,
								startsAt: session.startsAt,
								endsAt: session.endsAt,
								address: session.address,
							})),
						);
					}
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

				// Replace tags
				if (tagIds !== undefined) {
					await setActivityTags(
						tx,
						activityId,
						tagIds,
						existing.projectId,
					);
				}

				// Limite ou horários novos podem abrir vagas na fila
				await settleActivity(tx, await lockActivity(tx, activityId));
			});

			// E-mail de atualização só quando data/horário ou local mudam de
			// fato, e só para os inscritos no momento do commit.
			const changeSummary = describeActivityChanges({
				beforeSessions: existing.sessions,
				beforeAddress: existing.address,
				nextSessions: sessions,
				nextAddress: address,
			});
			if (changeSummary) {
				void notifyActivityUpdated({
					eventId: existing.projectId,
					activityId,
					changedAt: new Date(),
					changeSummary,
				});
			}
			return { success: true };
		}),

	updateActivityParticipants: protectedProcedure
		.input(
			z.object({
				activityId: z.string().uuid(),
				participantsIdsToMutate: z
					.union([z.array(z.uuid()), z.uuid()])
					.transform(toUniqueIds),
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

			const access = await requireActivityAccess(
				activityId,
				ctx.session.user.id,
			);
			await requireParticipantsInProject(
				access.projectId,
				participantsIdsToMutate,
			);

			const { inserted, resolved, projectId } = await db.transaction(
				async (tx) => {
					const locked = await lockActivity(tx, activityId);
					assertActivityOpen(locked);
					const queue = await settleActivity(tx, locked);
					const queued = await assertSeatsAvailable(
						tx,
						locked,
						queue,
						participantsIdsToMutate,
					);

					const inserted = await tx
						.insert(participantOnActivity)
						.values(
							participantsIdsToMutate.map((participantId) => ({
								activityId,
								participantId,
							})),
						)
						.onConflictDoNothing()
						.returning({
							participantId: participantOnActivity.participantId,
							subscribedAt: participantOnActivity.subscribedAt,
						});
					const resolved = await resolveEnrolledEntries(
						tx,
						activityId,
						queued,
						{
							type: "promoted",
							actorUserId: ctx.session.user.id,
						},
					);
					return { inserted, resolved, projectId: locked.projectId };
				},
			);

			const resolvedIds = new Set(
				resolved.map((entry) => entry.participantId),
			);
			const confirmed = inserted.filter(
				(entry) => !resolvedIds.has(entry.participantId),
			);
			const contacts = await loadNotificationRecipients([
				...confirmed.map((entry) => entry.participantId),
				...resolved.map((entry) => entry.participantId),
			]);
			void notifyActivityEnrollmentConfirmed({
				eventId: projectId,
				activityId,
				contacts,
				enrolled: confirmed,
			});
			void notifyActivityWaitlistPromoted({
				eventId: projectId,
				activityId,
				contacts,
				resolved,
			});

			return { success: true };
		}),

	addActivityParticipants: protectedProcedure
		.input(
			z.object({
				activityId: z.uuid(),
				participantsIdsToAdd: z
					.union([z.array(z.uuid()), z.uuid()])
					.transform(toUniqueIds),
				formAnswers: z
					.object({
						answers: z.record(z.string(), answerValueSchema),
					})
					.optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { activityId, participantsIdsToAdd, formAnswers } = input;

			if (!participantsIdsToAdd) {
				throw new TRPCError({
					message: "Participants not found.",
					code: "BAD_REQUEST",
				});
			}

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
					cause: { code: "REGISTRATION_CLOSED" },
				});
			}

			// Participante do requisitante no evento (uma única leitura,
			// reutilizada pelo probe do formulário e pelo gate de
			// auto-inscrição abaixo).
			const requesterParticipant = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, foundActivity.projectId),
					eq(participant.userId, ctx.session.user.id),
				),
				columns: { id: true },
			});
			const requesterParticipantId = requesterParticipant?.id ?? null;

			// Auto-inscrição: o requisitante inscreve SOMENTE a si mesmo.
			// Lote misto ou terceiros = fluxo de organizador (sem checagem
			// de conflito). Um organizador inscrevendo só a si mesmo cai
			// aqui — nenhum fluxo de UI faz isso hoje.
			const isSelfServiceJoin =
				!!requesterParticipantId &&
				participantsIdsToAdd.length === 1 &&
				participantsIdsToAdd.includes(requesterParticipantId);
			// A organização vem antes: sem ela, a resposta diria quem é do evento
			if (!isSelfServiceJoin) {
				await requireProjectAccess(
					foundActivity.projectId,
					ctx.session.user.id,
				);
				await requireParticipantsInProject(
					foundActivity.projectId,
					participantsIdsToAdd,
				);
			}

			// Respostas do formulário de inscrição da atividade (quando houver)
			const answerRows = await prepareActivityAnswers({
				projectId: foundActivity.projectId,
				activityId,
				participantIds: participantsIdsToAdd,
				formAnswers,
				subscribesSelf:
					!!requesterParticipantId &&
					participantsIdsToAdd.includes(requesterParticipantId),
			});

			const { inserted, resolved } = await db.transaction(async (tx) => {
				if (isSelfServiceJoin && requesterParticipantId) {
					// Checagem de conflito + inserção atômicas: dois joins
					// concorrentes do mesmo participante serializam e no
					// máximo um vence. Inscrições existentes nunca são tocadas.
					await lockParticipant(tx, requesterParticipantId);
					await assertNoScheduleConflict(
						tx,
						activityId,
						requesterParticipantId,
					);
				}

				// Quem se inscreve sozinho não passa à frente da fila; quem
				// tem oferta em aberto usa a vaga reservada para si.
				const locked = await lockActivity(tx, activityId);
				assertActivityOpen(locked);
				const queue = await settleActivity(tx, locked);
				const queued = await assertSeatsAvailable(
					tx,
					locked,
					queue,
					participantsIdsToAdd,
					{ queueFirst: isSelfServiceJoin },
				);

				const inserted = await persistEnrollment(tx, {
					projectId: locked.projectId,
					activityId,
					participantIds: participantsIdsToAdd,
					answerRows,
				});
				const resolved = await resolveEnrolledEntries(
					tx,
					activityId,
					queued,
					{
						type: isSelfServiceJoin ? "confirmed" : "promoted",
						actorUserId: isSelfServiceJoin
							? null
							: ctx.session.user.id,
					},
				);
				return { inserted, resolved };
			});

			// Só quem realmente ganhou vínculo novo recebe confirmação; quem
			// saiu da fila recebe a promoção (nunca os dois).
			const resolvedIds = new Set(
				resolved.map((entry) => entry.participantId),
			);
			const confirmed = inserted.filter(
				(entry) => !resolvedIds.has(entry.participantId),
			);
			const contacts = await loadNotificationRecipients([
				...confirmed.map((entry) => entry.participantId),
				...resolved.map((entry) => entry.participantId),
			]);
			void notifyActivityEnrollmentConfirmed({
				eventId: foundActivity.projectId,
				activityId,
				contacts,
				enrolled: confirmed,
			});
			void notifyActivityWaitlistPromoted({
				eventId: foundActivity.projectId,
				activityId,
				contacts,
				resolved,
			});

			return { success: true, projectId: foundActivity.projectId };
		}),

	addMonitorsToActivity: protectedProcedure
		.input(
			z.object({
				activityId: z.string().uuid(),
				participantsIdsToAdd: z
					.union([z.array(z.uuid()), z.uuid()])
					.transform(toUniqueIds),
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

			const access = await requireActivityAccess(
				activityId,
				ctx.session.user.id,
			);
			await requireParticipantsInProject(
				access.projectId,
				participantsIdsToAdd,
			);

			const toInsert: (typeof participantOnActivity.$inferInsert)[] =
				participantsIdsToAdd.map((participantId) => ({
					activityId,
					participantId,
					role: "monitor",
				}));

			await db.transaction(async (tx) => {
				const locked = await lockActivity(tx, activityId);

				// Quem já estava inscrito vira monitor e libera a vaga
				await tx
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

				for (const participantId of participantsIdsToAdd) {
					await closeEntry(tx, activityId, participantId, {
						type: "removed",
						actorUserId: ctx.session.user.id,
					});
				}
				await settleActivity(tx, locked);
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

			// Só o dono do evento pode cancelar a atividade.
			const found = await db.query.activity.findFirst({
				where: eq(activity.id, activityId),
				columns: { id: true, projectId: true, cancelledAt: true },
				with: { project: { columns: { ownerId: true } } },
			});

			if (!found) {
				throw new TRPCError({
					message: "Activity not found.",
					code: "NOT_FOUND",
				});
			}

			if (found.project.ownerId !== userId) {
				throw new TRPCError({
					message: "User not authorized to delete this activity.",
					code: "FORBIDDEN",
				});
			}

			// Idempotente: cancelar duas vezes não reenvia e-mails.
			if (found.cancelledAt) return { success: true };

			// Público capturado ANTES da transação: fechar a fila apagaria
			// a evidência de quem estava esperando (e precisa do aviso).
			const audience = await loadActivityAudience(activityId);

			await db.transaction(async (tx) => {
				await lockActivity(tx, activityId);
				await tx
					.update(activity)
					.set({ cancelledAt: new Date() })
					.where(eq(activity.id, activityId));

				// Fila ativa deixa de existir (status final `removed`); os
				// vínculos de inscrição ficam preservados para histórico.
				const closed = await tx
					.update(activityWaitlist)
					.set({ status: "removed", resolvedAt: new Date() })
					.where(
						and(
							eq(activityWaitlist.activityId, activityId),
							inArray(activityWaitlist.status, [
								"waiting",
								"offered",
							]),
						),
					)
					.returning({
						participantId: activityWaitlist.participantId,
					});
				if (closed.length > 0) {
					await tx.insert(activityWaitlistEvent).values(
						closed.map((row) => ({
							activityId,
							participantId: row.participantId,
							type: "removed" as const,
							actorUserId: userId,
						})),
					);
				}
			});

			void notifyActivityCancelled({
				eventId: found.projectId,
				activityId,
				participantIds: audience,
			});

			return { success: true };
		}),
	getDashboardStats: protectedProcedure
		.input(z.object({ projectId: z.string().uuid() }))
		.query(async ({ input, ctx }) => {
			const { projectId } = input;
			await requireProjectAccess(projectId, ctx.session.user.id);

			const now = new Date();
			const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
			const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);

			// Inscritos no evento (nível de inscrição, independente de
			// matrícula em atividades — `submitAnswers` cria só o `participant`)
			const signupsSince = (since: Date) =>
				sql<number>`count(*) filter (where ${participant.joinedAt} >= ${since})`.mapWith(
					Number,
				);
			const [signups] = await db
				.select({
					total: count(),
					lastHour: signupsSince(lastHour),
					lastDay: signupsSince(lastDay),
				})
				.from(participant)
				.where(eq(participant.projectId, projectId));
			const totalParticipants = signups?.total ?? 0;
			const participantsInLastHour = signups?.lastHour ?? 0;
			const activeParticipants = signups?.lastDay ?? 0;

			// Carga horária e vagas das atividades não canceladas (a soma
			// ignora as sem limite)
			const [activityTotals] = await db
				.select({
					workload: sum(activity.workload).mapWith(Number),
					possible: sum(activity.participantsLimit).mapWith(Number),
				})
				.from(activity)
				.where(
					and(
						eq(activity.projectId, projectId),
						isNull(activity.cancelledAt),
					),
				);
			const totalWorkload = activityTotals?.workload ?? 0;
			const totalPossible = activityTotals?.possible ?? 0;

			// Inscrições em atividades com limite
			const totalEnrollments = await db.$count(
				participantOnActivity,
				and(
					eq(participantOnActivity.role, "participant"),
					inArray(
						participantOnActivity.activityId,
						db
							.select({ id: activity.id })
							.from(activity)
							.where(
								and(
									eq(activity.projectId, projectId),
									isNotNull(activity.participantsLimit),
									isNull(activity.cancelledAt),
								),
							),
					),
				),
			);

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
					date: localTrunc("day", participant.joinedAt),
					count: count(),
				})
				.from(participant)
				.where(
					and(
						eq(participant.projectId, projectId),
						gte(participant.joinedAt, sevenDaysAgo),
					),
				)
				.groupBy(localTrunc("day", participant.joinedAt))
				.orderBy(localTrunc("day", participant.joinedAt));

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
						date: formatLocalBucket(row.date, "day"),
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
						hour: localTrunc("hour", participant.joinedAt),
						count: count(),
					})
					.from(participant)
					.where(
						and(
							eq(participant.projectId, projectId),
							gte(participant.joinedAt, twentyFourHoursAgo),
						),
					)
					.groupBy(localTrunc("hour", participant.joinedAt))
					.orderBy(localTrunc("hour", participant.joinedAt));

				let cumulative = 0;
				graphData = hoursDataQuery.map((row) => {
					cumulative += row.count;
					return {
						date: formatLocalBucket(row.hour, "hour"),
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
	getBreakdownFields: protectedProcedure
		.input(z.object({ projectId: z.string().uuid() }))
		.query(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);

			// Latest published version of every scope: the event-wide form and
			// each activity's form.
			const versions = await db.query.formVersion.findMany({
				where: and(
					eq(formVersion.projectId, input.projectId),
					eq(formVersion.isPublished, true),
				),
				columns: { id: true, activityId: true },
			});
			if (versions.length === 0) return [];

			const versionIds = versions.map((v) => v.id);

			const [fields, activities] = await Promise.all([
				db.query.formField.findMany({
					where: and(
						inArray(formField.formVersionId, versionIds),
						inArray(formField.type, [...BREAKDOWN_FIELD_TYPES]),
						eq(formField.isActive, true),
					),
					columns: {
						id: true,
						key: true,
						label: true,
						type: true,
						options: true,
						allowOther: true,
						formVersionId: true,
					},
					orderBy: [asc(formField.order)],
				}),
				db
					.select({ id: activity.id, name: activity.name })
					.from(activity)
					.where(eq(activity.projectId, input.projectId)),
			]);

			const activityNameById = new Map(
				activities.map((a) => [a.id, a.name]),
			);
			let scopeTitleByFieldVersionId: Map<string, string> | null = null;
			for (const version of versions) {
				if (!version.activityId) continue;
				const name = activityNameById.get(version.activityId);
				if (!name) continue;
				scopeTitleByFieldVersionId ??= new Map();
				scopeTitleByFieldVersionId.set(version.id, name);
			}

			return fields.map((field) => ({
				id: field.id,
				key: field.key,
				label: field.label,
				type: field.type,
				options: field.options ?? [],
				allowOther: field.allowOther ?? false,
				// `null` = the event-wide form; otherwise the owning activity's name
				activityTitle:
					scopeTitleByFieldVersionId?.get(field.formVersionId) ??
					null,
			}));
		}),
	getBreakdownSeries: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				// Omitted selects the default registrations series (no breakdown)
				fieldId: z.string().uuid().optional(),
				window: z.enum(BREAKDOWN_TIME_WINDOWS).default("7d"),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { projectId, window } = input;
			await requireProjectAccess(projectId, ctx.session.user.id);

			// Bucket granularity: hours for the 24h window, days otherwise.
			const granularity = window === "24h" ? "hour" : "day";
			const truncate = (column: AnyColumn) =>
				localTrunc(granularity, column);

			// Window bounds. "event" anchors on the project dates; "all" is unbounded.
			const now = new Date();
			let from: Date | null = null;
			let to: Date | null = null;
			switch (window) {
				case "24h": {
					from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
					break;
				}
				case "7d": {
					from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					break;
				}
				case "30d": {
					from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
					break;
				}
				case "event": {
					const foundProject = await db.query.project.findFirst({
						where: eq(project.id, projectId),
						columns: { startDate: true, endDate: true },
					});
					if (foundProject) {
						from = foundProject.startDate;
						to = foundProject.endDate;
					}
					break;
				}
			}

			type BreakdownFieldRow = typeof formField.$inferSelect & {
				version: { isPublished: boolean; projectId: string };
			};
			let field: BreakdownFieldRow | null = null;
			if (input.fieldId) {
				field =
					(await db.query.formField.findFirst({
						where: and(
							eq(formField.id, input.fieldId),
							eq(formField.projectId, projectId),
						),
						with: {
							version: {
								columns: { isPublished: true, projectId: true },
							},
						},
					})) ?? null;
				if (
					!field ||
					!field.version.isPublished ||
					field.version.projectId !== projectId
				) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Campo de formulário não encontrado.",
					});
				}
				if (
					!BREAKDOWN_FIELD_TYPES.includes(
						field.type as (typeof BREAKDOWN_FIELD_TYPES)[number],
					)
				) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Campo não possui opções predefinidas.",
					});
				}
			}

			// Counts per bucket per series key. Aggregation happens server-side:
			// raw answers only feed the counters, never leave the server.
			const perBucket = new Map<string, Map<string, number>>();
			const addCount = (date: string, key: string, amount: number) => {
				let point = perBucket.get(date);
				if (!point) {
					point = new Map();
					perBucket.set(date, point);
				}
				point.set(key, (point.get(key) ?? 0) + amount);
			};
			// Timestamp bounds for the joined-at column of the current query path.
			const timeFilters = [
				from ? gte(participant.joinedAt, from) : undefined,
				to ? lte(participant.joinedAt, to) : undefined,
			];

			if (field) {
				const declaredOptions = new Set(field.options ?? []);
				const toKey = (raw: string) =>
					declaredOptions.has(raw) ? raw : BREAKDOWN_OTHER_SERIES;

				if (field.type === "select_multiple") {
					// A participant selecting several options counts once per
					// option on the day their event registration happened.
					const rows = await db
						.select({
							bucket: truncate(participant.joinedAt),
							value: formAnswer.valueJson,
						})
						.from(formAnswer)
						.innerJoin(
							participant,
							eq(formAnswer.participantId, participant.id),
						)
						.where(
							and(
								eq(formAnswer.fieldId, field.id),
								eq(formAnswer.projectId, projectId),
								...timeFilters,
							),
						);

					for (const row of rows) {
						if (!Array.isArray(row.value)) continue;
						for (const raw of row.value) {
							if (typeof raw !== "string") continue;
							addCount(row.bucket, toKey(raw), 1);
						}
					}
				} else {
					const trunc = truncate(participant.joinedAt);
					const rows = await db
						.select({
							bucket: trunc,
							value: formAnswer.valueText,
							count: countDistinct(formAnswer.participantId),
						})
						.from(formAnswer)
						.innerJoin(
							participant,
							eq(formAnswer.participantId, participant.id),
						)
						.where(
							and(
								eq(formAnswer.fieldId, field.id),
								eq(formAnswer.projectId, projectId),
								...timeFilters,
							),
						)
						.groupBy(trunc, formAnswer.valueText)
						.orderBy(trunc);

					for (const row of rows) {
						if (!row.value) continue;
						addCount(row.bucket, toKey(row.value), row.count);
					}
				}
			} else {
				// Default: event registrations per bucket, mirroring the
				// getDashboardStats graph (signup-level, no activity joins —
				// `submitAnswers` creates only the `participant` row).
				const trunc = truncate(participant.joinedAt);
				const rows = await db
					.select({
						bucket: trunc,
						count: count(),
					})
					.from(participant)
					.where(
						and(
							eq(participant.projectId, projectId),
							...timeFilters,
						),
					)
					.groupBy(trunc)
					.orderBy(trunc);

				for (const row of rows) {
					addCount(
						row.bucket,
						BREAKDOWN_REGISTRATIONS_SERIES,
						row.count,
					);
				}
			}

			const totals: Record<string, number> = {};
			for (const point of perBucket.values()) {
				for (const [key, amount] of point) {
					totals[key] = (totals[key] ?? 0) + amount;
				}
			}

			let series: string[];
			if (field) {
				// Series follow the field's declared option order, then the
				// fallback bucket. Too many options make the chart unreadable,
				// so least-answered ones fold into "Outros".
				series = (field.options ?? []).filter(
					(option) => totals[option] !== undefined,
				);
				if (series.length > BREAKDOWN_MAX_SERIES - 1) {
					const top = [...series]
						.sort(
							(a, b) =>
								(totals[b] ?? 0) - (totals[a] ?? 0) ||
								a.localeCompare(b),
						)
						.slice(0, BREAKDOWN_MAX_SERIES - 1);
					const folded = series.filter(
						(option) => !top.includes(option),
					);
					for (const point of perBucket.values()) {
						const merged =
							(point.get(BREAKDOWN_OTHER_SERIES) ?? 0) +
							folded.reduce(
								(sum_, key) => sum_ + (point.get(key) ?? 0),
								0,
							);
						for (const key of folded) point.delete(key);
						if (merged > 0)
							point.set(BREAKDOWN_OTHER_SERIES, merged);
					}
					for (const key of folded) delete totals[key];
					series = top;
				}
				if ((totals[BREAKDOWN_OTHER_SERIES] ?? 0) > 0) {
					series = [...series, BREAKDOWN_OTHER_SERIES];
				}
			} else {
				series = [BREAKDOWN_REGISTRATIONS_SERIES];
			}

			const formatBucket = (raw: string) =>
				formatLocalBucket(raw, granularity);

			const data = [...perBucket.entries()]
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([bucketDate, point]) => {
					const row: {
						date: string;
						counts: Record<string, number>;
					} = { date: formatBucket(bucketDate), counts: {} };
					for (const key of series) {
						row.counts[key] = point.get(key) ?? 0;
					}
					return row;
				});

			return {
				field: field
					? {
							id: field.id,
							key: field.key,
							label: field.label,
							type: field.type,
							options: field.options ?? [],
							allowOther: field.allowOther ?? false,
						}
					: null,
				series,
				totals,
				data,
			};
		}),
	getReleasableActivities: protectedProcedure
		.input(z.object({ projectId: z.uuid() }))
		.query(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);

			// Closed registrations, and not yet ended
			const rows = await db.query.activity.findMany({
				where: (table, { and: _and, eq: _eq }) =>
					_and(
						_eq(table.projectId, input.projectId),
						_eq(table.isRegistrationOpen, false),
						hasUpcomingSession(table),
					),
				with: {
					sessions: {
						orderBy: asc(activitySession.startsAt),
					},
					tagOnActivity: {
						with: { tag: true },
					},
				},
				orderBy: (table, { asc: _asc }) =>
					_asc(firstSessionStart(table)),
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

			await requireProjectAccess(input.projectId, ctx.session.user.id);

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
