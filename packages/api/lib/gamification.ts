import {
	eventDayCount,
	eventDayKey,
	eventDayKeys,
	GAMIFICATION_STICKERS,
	isSessionCompleted,
	isStickerAvailable,
	parseGamificationConfig,
	resolveStickerProgress,
	sessionHours,
	sessionPoints,
	type GamificationConfig,
	type GamificationStats,
	type PointEventSource,
	type StickerContext,
	type StickerDefinition,
	type StickerProgress,
} from "@verific/drizzle/gamification";
import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	inArray,
	lt,
	notInArray,
	or,
	sql,
} from "@verific/drizzle/orm";
import {
	activity,
	activitySession,
	participant,
	participantCheckin,
	participantPointEvent,
	participantPoints,
	participantSticker,
	profileConnection,
	projectModerator,
	sessionAttendance,
	user,
} from "@verific/drizzle/schema";

import type { Tx } from "../seats";

/** Subconjunto do cliente drizzle usado aqui (raiz ou transação). */
export type GamificationClient = Pick<
	Tx,
	"select" | "insert" | "update" | "delete" | "query"
>;

/**
 * Serviço de gamificação — toda escrita/leitura passa por aqui.
 *
 * Pontos vivem num ledger idempotente (`dedupeKey`) + um agregado por
 * participante. As funções recebem `tx` para que a atribuição acompanhe a
 * transação da ação original (check-in, presença, inscrição) sem perder a
 * atomicidade; quando o ponto é acessório, o chamador isola a chamada num
 * savepoint para nunca bloquear a ação principal.
 */

export interface GamificationProject {
	id: string;
	ownerId: string;
	startDate: Date;
	endDate: Date;
	gamification: unknown;
	profilesEnabled?: boolean | null;
	moderators?: Array<{ userId: string }>;
}

export interface StickerAward {
	key: string;
	name: string;
	description: string;
	icon: StickerDefinition["icon"];
	tier: StickerDefinition["tier"];
}

export const pointKeys = {
	checkin: (participantId: string) => `checkin:${participantId}`,
	daily: (participantId: string, day: string) =>
		`daily:${participantId}:${day}`,
	session: (participantId: string, sessionId: string) =>
		`session:${participantId}:${sessionId}`,
	completion: (participantId: string, sessionId: string) =>
		`completion:${participantId}:${sessionId}`,
	enrollment: (participantId: string, activityId: string) =>
		`enroll:${participantId}:${activityId}`,
	manual: (token: string) => `manual:${token}`,
} as const;

export function projectConfig(project: { gamification: unknown }) {
	return parseGamificationConfig(project.gamification);
}

export function isGamificationOn(project: { gamification: unknown }): boolean {
	return projectConfig(project).enabled;
}

/**
 * Grava um lançamento e atualiza o total. Idempotente: se `dedupeKey` já
 * existe, nada muda e o total atual é devolvido.
 */
export async function awardPoints(
	tx: Tx,
	input: {
		projectId: string;
		participantId: string;
		source: PointEventSource;
		dedupeKey: string;
		points: number;
		note?: string | null;
		awardedByUserId?: string | null;
	},
): Promise<{ awarded: boolean; total: number }> {
	const inserted = await tx
		.insert(participantPointEvent)
		.values({
			projectId: input.projectId,
			participantId: input.participantId,
			source: input.source,
			dedupeKey: input.dedupeKey,
			points: input.points,
			note: input.note ?? null,
			awardedByUserId: input.awardedByUserId ?? null,
		})
		.onConflictDoNothing()
		.returning({ id: participantPointEvent.id });

	const [totalRow] = await tx
		.insert(participantPoints)
		.values({
			participantId: input.participantId,
			projectId: input.projectId,
			total: inserted.length > 0 ? input.points : 0,
		})
		.onConflictDoUpdate({
			target: participantPoints.participantId,
			set: {
				projectId: input.projectId,
				total:
					inserted.length > 0
						? sql`${participantPoints.total} + ${input.points}`
						: participantPoints.total,
			},
		})
		.returning({ total: participantPoints.total });

	return { awarded: inserted.length > 0, total: totalRow?.total ?? 0 };
}

/** Remove lançamentos (ex.: inscrição cancelada) e devolve o total restante. */
export async function revokePoints(
	tx: Tx,
	input: {
		projectId: string;
		participantId: string;
		dedupeKeys: string[];
	},
): Promise<number> {
	if (input.dedupeKeys.length === 0)
		return getPointsTotal(tx, input.participantId);

	const [sum] = await tx
		.select({
			points: sql<number>`coalesce(sum(${participantPointEvent.points}), 0)`,
		})
		.from(participantPointEvent)
		.where(
			and(
				eq(participantPointEvent.projectId, input.projectId),
				eq(participantPointEvent.participantId, input.participantId),
				inArray(participantPointEvent.dedupeKey, input.dedupeKeys),
			),
		);

	const removed = Number(sum?.points ?? 0);
	if (removed === 0) return getPointsTotal(tx, input.participantId);

	await tx
		.delete(participantPointEvent)
		.where(
			and(
				eq(participantPointEvent.projectId, input.projectId),
				eq(participantPointEvent.participantId, input.participantId),
				inArray(participantPointEvent.dedupeKey, input.dedupeKeys),
			),
		);

	const [totalRow] = await tx
		.update(participantPoints)
		.set({
			total: sql`greatest(0, ${participantPoints.total} - ${removed})`,
		})
		.where(eq(participantPoints.participantId, input.participantId))
		.returning({ total: participantPoints.total });

	return totalRow?.total ?? 0;
}

export async function getPointsTotal(
	tx: GamificationClient,
	participantId: string,
): Promise<number> {
	const [row] = await tx
		.select({ total: participantPoints.total })
		.from(participantPoints)
		.where(eq(participantPoints.participantId, participantId));
	return row?.total ?? 0;
}

interface AttendanceRow {
	sessionId: string;
	startsAt: Date;
	endsAt: Date;
	joinedAt: Date;
	leftAt: Date | null;
}

/**
 * Monta as estatísticas usadas por ranking/adesivos a partir das linhas
 * brutas. Separado das queries para ficar testável sem banco.
 */
export function buildStickerStats(input: {
	attendance: AttendanceRow[];
	checkinDays: string[];
	connections: number;
	eventDays: number;
	graceMinutes: number;
	beforeHour: number;
}): Pick<
	GamificationStats,
	| "distinctDays"
	| "sessions"
	| "hours"
	| "earlySessions"
	| "completedSessions"
> {
	const days = new Set(input.checkinDays);
	let hours = 0;
	let earlySessions = 0;
	let completedSessions = 0;

	for (const row of input.attendance) {
		days.add(eventDayKey(row.joinedAt));
		hours += sessionHours(row.startsAt, row.endsAt);
		if (sessionStartHour(row.startsAt) < input.beforeHour) {
			earlySessions += 1;
		}
		if (
			isSessionCompleted({
				startsAt: row.startsAt,
				endsAt: row.endsAt,
				joinedAt: row.joinedAt,
				leftAt: row.leftAt,
				graceMinutes: input.graceMinutes,
			})
		) {
			completedSessions += 1;
		}
	}

	return {
		distinctDays: days.size,
		sessions: input.attendance.length,
		hours: Math.round(hours * 100) / 100,
		earlySessions,
		completedSessions,
	};
}

const SESSION_HOUR_FORMATTER = new Intl.DateTimeFormat("en-US", {
	timeZone: "America/Sao_Paulo",
	hour: "numeric",
	hourCycle: "h23",
});

function sessionStartHour(date: Date | string | number): number {
	const hour = Number(SESSION_HOUR_FORMATTER.format(new Date(date)));
	return Number.isFinite(hour) ? hour : 99;
}

interface LoadedStats {
	config: GamificationConfig;
	stats: GamificationStats;
	context: StickerContext;
	total: number;
	rank: number | null;
	optOut: boolean;
}

/**
 * Coleta presença, sessões, conexões e posição no ranking de um
 * participante. O rank só é calculado quando ele é elegível (não está
 * opt-out nem é staff excluída).
 *
 * `includeRank: false` pula a consulta de posição (a mais cara daqui) para
 * chamadores que só precisam de adesivos/estatísticas.
 */
export async function loadParticipantStats(
	tx: GamificationClient,
	project: GamificationProject,
	participantId: string,
	options?: { includeRank?: boolean },
): Promise<LoadedStats> {
	const config = projectConfig(project);
	const eventDays = eventDayCount(project.startDate, project.endDate);

	const [me] = await tx
		.select({
			joinedAt: participant.joinedAt,
			userId: participant.userId,
			rankingOptOut: participant.rankingOptOut,
		})
		.from(participant)
		.where(eq(participant.id, participantId));

	// O chamador quase sempre já carregou os moderadores junto do projeto
	// (`requireProjectAccess`); só cai na query quando não veio.
	const moderatorRowsPromise = project.moderators
		? Promise.resolve(project.moderators)
		: tx
				.select({ userId: projectModerator.userId })
				.from(projectModerator)
				.where(eq(projectModerator.projectId, project.id));

	const [checkinRows, attendance, connections, pointsRow, moderatorRows] =
		await Promise.all([
			tx
				.select({ day: participantCheckin.day })
				.from(participantCheckin)
				.where(eq(participantCheckin.participantId, participantId)),
			tx
				.select({
					sessionId: activitySession.id,
					startsAt: activitySession.startsAt,
					endsAt: activitySession.endsAt,
					joinedAt: sessionAttendance.joinedAt,
					leftAt: sessionAttendance.leftAt,
				})
				.from(sessionAttendance)
				.innerJoin(
					activitySession,
					eq(sessionAttendance.sessionId, activitySession.id),
				)
				.innerJoin(
					activity,
					eq(activitySession.activityId, activity.id),
				)
				.where(
					and(
						eq(sessionAttendance.participantId, participantId),
						eq(activity.projectId, project.id),
					),
				),
			tx
				.select({ amount: count() })
				.from(profileConnection)
				.where(
					and(
						eq(profileConnection.projectId, project.id),
						eq(
							profileConnection.viewedParticipantId,
							participantId,
						),
					),
				),
			tx
				.select({ total: participantPoints.total })
				.from(participantPoints)
				.where(eq(participantPoints.participantId, participantId)),
			moderatorRowsPromise,
		]);

	const total = pointsRow[0]?.total ?? 0;
	// Se o organizador desligou o opt-out, o flag antigo deixa de valer.
	const optOut = config.ranking.allowOptOut && Boolean(me?.rankingOptOut);
	const staffIds = staffUserIds(project, moderatorRows);
	const isStaff = Boolean(me?.userId && staffIds.includes(me.userId));

	const attendanceRows: AttendanceRow[] = attendance;
	const partial = buildStickerStats({
		attendance: attendanceRows,
		checkinDays: checkinRows.map((row) => row.day),
		connections: Number(connections[0]?.amount ?? 0),
		eventDays,
		graceMinutes: config.sessions.completionGraceMinutes,
		beforeHour: 9,
	});

	const rankEligible =
		options?.includeRank !== false &&
		!optOut &&
		(config.ranking.includeStaff || !isStaff) &&
		Boolean(me);

	const rank = rankEligible
		? await loadRankPosition(tx, {
				project,
				participantId,
				joinedAt: me!.joinedAt,
				total,
				excludeOptOut: config.ranking.allowOptOut,
				excludeStaff: !config.ranking.includeStaff,
				staffIds,
			})
		: null;

	return {
		config,
		total,
		rank,
		optOut,
		context: {
			eventDays,
			checkoutEnabled: config.sessions.checkoutEnabled,
		},
		stats: {
			checkins: checkinRows.length,
			connections: Number(connections[0]?.amount ?? 0),
			rank,
			...partial,
		},
	};
}

/** Dono + moderadores do evento (fonte única para excluir staff do ranking). */
function staffUserIds(
	project: GamificationProject,
	moderatorRows: Array<{ userId: string }>,
): string[] {
	return [
		project.ownerId,
		...(project.moderators?.map((moderator) => moderator.userId) ?? []),
		...moderatorRows.map((row) => row.userId),
	];
}

/** Filtros comuns do ranking: opt-out e staff aplicados. */
function rankingFilters(
	config: GamificationConfig,
	projectId: string,
	staffIds: string[],
) {
	const filters = [eq(participantPoints.projectId, projectId)];
	if (config.ranking.allowOptOut) {
		filters.push(eq(participant.rankingOptOut, false));
	}
	if (!config.ranking.includeStaff && staffIds.length > 0) {
		filters.push(notInArray(participant.userId, staffIds));
	}
	return filters;
}

async function loadRankPosition(
	tx: GamificationClient,
	input: {
		project: GamificationProject;
		participantId: string;
		joinedAt: Date;
		total: number;
		excludeOptOut: boolean;
		excludeStaff: boolean;
		staffIds: string[];
	},
): Promise<number> {
	const filters = [
		eq(participantPoints.projectId, input.project.id),
		or(
			gt(participantPoints.total, input.total),
			and(
				eq(participantPoints.total, input.total),
				lt(participant.joinedAt, input.joinedAt),
			),
			and(
				eq(participantPoints.total, input.total),
				eq(participant.joinedAt, input.joinedAt),
				lt(participant.id, input.participantId),
			),
		),
	];
	if (input.excludeOptOut) {
		filters.push(eq(participant.rankingOptOut, false));
	}
	if (input.excludeStaff && input.staffIds.length > 0) {
		filters.push(notInArray(participant.userId, input.staffIds));
	}

	const [row] = await tx
		.select({ position: sql<number>`count(*) + 1` })
		.from(participantPoints)
		.innerJoin(
			participant,
			eq(participant.id, participantPoints.participantId),
		)
		.where(and(...filters));

	return Number(row?.position ?? 1);
}

/** Adesivos recém-conquistados (só os inseridos agora). */
export async function evaluateStickers(
	tx: GamificationClient,
	project: GamificationProject,
	participantId: string,
): Promise<StickerAward[]> {
	const config = projectConfig(project);
	if (!config.enabled || !config.stickersEnabled) return [];

	const context: StickerContext = {
		eventDays: eventDayCount(project.startDate, project.endDate),
		checkoutEnabled: config.sessions.checkoutEnabled,
	};
	const available = GAMIFICATION_STICKERS.filter((sticker) =>
		isStickerAvailable(sticker, context),
	);
	if (available.length === 0) return [];

	// Caminho quente (check-in/presença): quase sempre todos os adesivos
	// possíveis já foram concedidos. Ler só as chaves existentes encerra a
	// avaliação com uma query, em vez de recalcular todas as estatísticas.
	const earnedRows = await tx
		.select({ stickerKey: participantSticker.stickerKey })
		.from(participantSticker)
		.where(eq(participantSticker.participantId, participantId));
	const earned = new Set(earnedRows.map((row) => row.stickerKey));
	const pending = available.filter((sticker) => !earned.has(sticker.key));
	if (pending.length === 0) return [];

	const loaded = await loadParticipantStats(tx, project, participantId, {
		// A posição no ranking só importa se o adesivo de rank ainda está aberto.
		includeRank: pending.some(
			(sticker) => sticker.criterion.type === "rank",
		),
	});

	const earnedKeys = pending
		.filter(
			(sticker) =>
				resolveStickerProgress(sticker, loaded.stats, loaded.context)
					.earned,
		)
		.map((sticker) => sticker.key);
	if (earnedKeys.length === 0) return [];

	const inserted = await tx
		.insert(participantSticker)
		.values(
			earnedKeys.map((stickerKey) => ({
				projectId: project.id,
				participantId,
				stickerKey,
				source: "auto" as const,
			})),
		)
		.onConflictDoNothing()
		.returning({ stickerKey: participantSticker.stickerKey });

	return inserted.flatMap((row) => {
		const sticker = GAMIFICATION_STICKERS.find(
			(candidate) => candidate.key === row.stickerKey,
		);
		return sticker
			? [
					{
						key: sticker.key,
						name: sticker.name,
						description: sticker.description,
						icon: sticker.icon,
						tier: sticker.tier,
					},
				]
			: [];
	});
}

function stickerUnit(
	sticker: StickerDefinition,
):
	| "checkin"
	| "sessions"
	| "hours"
	| "connections"
	| "days"
	| "rank"
	| "early" {
	switch (sticker.criterion.type) {
		case "checkin":
			return "checkin";
		case "sessions":
		case "completed-sessions":
			return "sessions";
		case "hours":
			return "hours";
		case "connections":
			return "connections";
		case "days":
		case "all-days":
			return "days";
		case "rank":
			return "rank";
		case "early-session":
			return "early";
	}
}

export interface GamificationSnapshot {
	points: number;
	rank: number | null;
	totalParticipants: number;
	optOut: boolean;
	eventDays: number;
	checkoutEnabled: boolean;
	stickers: Array<
		StickerProgress & {
			key: string;
			name: string;
			description: string;
			icon: StickerDefinition["icon"];
			tier: StickerDefinition["tier"];
			earnedAt: Date | null;
			unit:
				| "checkin"
				| "sessions"
				| "hours"
				| "connections"
				| "days"
				| "rank"
				| "early";
		}
	>;
}

/** Snapshot público do perfil (pontos, posição e progresso dos adesivos). */
export async function loadGamificationSnapshot(
	tx: GamificationClient,
	project: GamificationProject,
	participantId: string,
): Promise<GamificationSnapshot> {
	const loaded = await loadParticipantStats(tx, project, participantId);
	const earnedRows = await tx
		.select({
			stickerKey: participantSticker.stickerKey,
			earnedAt: participantSticker.earnedAt,
		})
		.from(participantSticker)
		.where(eq(participantSticker.participantId, participantId));
	const earned = new Map(
		earnedRows.map((row) => [row.stickerKey, row.earnedAt]),
	);

	const totalParticipants = await loadRankingTotal(tx, project);

	return {
		points: loaded.total,
		rank: loaded.rank,
		totalParticipants,
		optOut: loaded.optOut,
		eventDays: loaded.context.eventDays,
		checkoutEnabled: loaded.context.checkoutEnabled,
		stickers: GAMIFICATION_STICKERS.map((sticker) => {
			const progress = resolveStickerProgress(
				sticker,
				loaded.stats,
				loaded.context,
			);
			const earnedAt = earned.get(sticker.key) ?? null;
			return {
				key: sticker.key,
				name: sticker.name,
				description: sticker.description,
				icon: sticker.icon,
				tier: sticker.tier,
				earnedAt,
				unit: stickerUnit(sticker),
				...progress,
				earned: progress.earned || Boolean(earnedAt),
			};
		}),
	};
}

export interface ReceptionCheckinResult {
	alreadyCheckedIn: boolean;
	firstCheckin: boolean;
	pointsAwarded: number;
	totalPoints: number;
	day: string;
	unlockedStickers: StickerAward[];
}

/**
 * Check-in de recepção do dia. O registro de presença é sempre gravado
 * (mesmo com pontos zerados); os pontos e adesivos são derivados dele.
 */
export async function checkInAtReception(
	tx: Tx,
	input: {
		project: GamificationProject;
		participantId: string;
		actorUserId: string;
		now?: Date;
	},
): Promise<ReceptionCheckinResult> {
	const config = projectConfig(input.project);
	if (!config.enabled) {
		throw new Error("GAMIFICATION_DISABLED");
	}

	const now = input.now ?? new Date();
	const day = eventDayKey(now);
	const days = eventDayKeys(input.project.startDate, input.project.endDate);
	if (!days.includes(day)) {
		throw new Error("OUTSIDE_EVENT");
	}

	const inserted = await tx
		.insert(participantCheckin)
		.values({
			projectId: input.project.id,
			participantId: input.participantId,
			day,
			checkedInAt: now,
			checkedInByUserId: input.actorUserId,
		})
		.onConflictDoNothing()
		.returning({ id: participantCheckin.id });

	if (inserted.length === 0) {
		return {
			alreadyCheckedIn: true,
			firstCheckin: false,
			pointsAwarded: 0,
			totalPoints: await getPointsTotal(tx, input.participantId),
			day,
			unlockedStickers: [],
		};
	}

	const [countRow] = await tx
		.select({ amount: count() })
		.from(participantCheckin)
		.where(eq(participantCheckin.participantId, input.participantId));
	const firstCheckin = Number(countRow?.amount ?? 0) === 1;

	let pointsAwarded = 0;
	let unlockedStickers: StickerAward[] = [];
	try {
		// Savepoint: uma falha na gamificação nunca desfaz o check-in.
		await tx.transaction(async (sp) => {
			pointsAwarded = 0;
			if (firstCheckin && config.presence.firstCheckinPoints > 0) {
				const result = await awardPoints(sp, {
					projectId: input.project.id,
					participantId: input.participantId,
					source: "checkin",
					dedupeKey: pointKeys.checkin(input.participantId),
					points: config.presence.firstCheckinPoints,
					awardedByUserId: input.actorUserId,
				});
				if (result.awarded) {
					pointsAwarded += config.presence.firstCheckinPoints;
				}
			}

			if (
				config.presence.dailyEnabled &&
				config.presence.dailyPoints > 0
			) {
				const result = await awardPoints(sp, {
					projectId: input.project.id,
					participantId: input.participantId,
					source: "daily",
					dedupeKey: pointKeys.daily(input.participantId, day),
					points: config.presence.dailyPoints,
					awardedByUserId: input.actorUserId,
				});
				if (result.awarded) {
					pointsAwarded += config.presence.dailyPoints;
				}
			}

			unlockedStickers = await evaluateStickers(
				sp,
				input.project,
				input.participantId,
			);
		});
	} catch {
		pointsAwarded = 0;
		unlockedStickers = [];
	}

	return {
		alreadyCheckedIn: false,
		firstCheckin,
		pointsAwarded,
		totalPoints: await getPointsTotal(tx, input.participantId),
		day,
		unlockedStickers,
	};
}

export interface SessionPointsResult {
	pointsAwarded: number;
	totalPoints: number;
	unlockedStickers: StickerAward[];
	completed: boolean;
}

/** Pontos por presença na sessão (duração agendada). Idempotente. */
export async function awardSessionAttendance(
	tx: Tx,
	input: {
		project: GamificationProject;
		participantId: string;
		session: {
			id: string;
			startsAt: Date;
			endsAt: Date;
		};
	},
): Promise<SessionPointsResult> {
	const config = projectConfig(input.project);
	if (!config.enabled) {
		return {
			pointsAwarded: 0,
			totalPoints: 0,
			unlockedStickers: [],
			completed: false,
		};
	}

	const points = sessionPoints({
		startsAt: input.session.startsAt,
		endsAt: input.session.endsAt,
		perHour: config.sessions.perHour,
	});
	const result = await awardPoints(tx, {
		projectId: input.project.id,
		participantId: input.participantId,
		source: "session",
		dedupeKey: pointKeys.session(input.participantId, input.session.id),
		points,
	});

	const unlockedStickers = await evaluateStickers(
		tx,
		input.project,
		input.participantId,
	);

	return {
		pointsAwarded: result.awarded ? points : 0,
		totalPoints: result.total,
		unlockedStickers,
		completed: false,
	};
}

/** Bônus + adesivo de quem ficou até o fim da sessão. */
export async function awardSessionCompletion(
	tx: Tx,
	input: {
		project: GamificationProject;
		participantId: string;
		session: {
			id: string;
			startsAt: Date;
			endsAt: Date;
		};
		joinedAt: Date;
		leftAt: Date;
	},
): Promise<SessionPointsResult> {
	const config = projectConfig(input.project);
	if (!config.enabled || !config.sessions.checkoutEnabled) {
		return {
			pointsAwarded: 0,
			totalPoints: 0,
			unlockedStickers: [],
			completed: false,
		};
	}

	const completed = isSessionCompleted({
		startsAt: input.session.startsAt,
		endsAt: input.session.endsAt,
		joinedAt: input.joinedAt,
		leftAt: input.leftAt,
		graceMinutes: config.sessions.completionGraceMinutes,
	});
	if (!completed) {
		return {
			pointsAwarded: 0,
			totalPoints: await getPointsTotal(tx, input.participantId),
			unlockedStickers: [],
			completed: false,
		};
	}

	const points = config.sessions.completionBonus;
	const result = await awardPoints(tx, {
		projectId: input.project.id,
		participantId: input.participantId,
		source: "completion",
		dedupeKey: pointKeys.completion(input.participantId, input.session.id),
		points,
	});

	const unlockedStickers = await evaluateStickers(
		tx,
		input.project,
		input.participantId,
	);

	return {
		pointsAwarded: result.awarded ? points : 0,
		totalPoints: result.total,
		unlockedStickers,
		completed: true,
	};
}

/** Inscrição em atividade (revogada se a inscrição for cancelada). */
export async function awardEnrollment(
	tx: Tx,
	input: {
		project: GamificationProject;
		participantId: string;
		activityId: string;
	},
): Promise<number> {
	const config = projectConfig(input.project);
	if (!config.enabled) return 0;
	if (config.enrollmentPoints <= 0) return 0;

	const result = await awardPoints(tx, {
		projectId: input.project.id,
		participantId: input.participantId,
		source: "enrollment",
		dedupeKey: pointKeys.enrollment(input.participantId, input.activityId),
		points: config.enrollmentPoints,
	});
	return result.awarded ? config.enrollmentPoints : 0;
}

/** Reverte pontos de uma inscrição removida (presenças + inscrição). */
export async function revokeActivityPoints(
	tx: Tx,
	input: {
		projectId: string;
		participantId: string;
		activityId: string;
		sessionIds: string[];
	},
): Promise<number> {
	return revokePoints(tx, {
		projectId: input.projectId,
		participantId: input.participantId,
		dedupeKeys: [
			pointKeys.enrollment(input.participantId, input.activityId),
			...input.sessionIds.map((sessionId) =>
				pointKeys.session(input.participantId, sessionId),
			),
			...input.sessionIds.map((sessionId) =>
				pointKeys.completion(input.participantId, sessionId),
			),
		],
	});
}

export interface RankingRow {
	participantId: string;
	shortId: string;
	name: string;
	avatarUrl: string | null;
	points: number;
	rank: number;
}

/** Total de participantes elegíveis (só a contagem, sem a lista). */
async function loadRankingTotal(
	tx: GamificationClient,
	project: GamificationProject,
): Promise<number> {
	const config = projectConfig(project);
	const moderatorRows = project.moderators
		? project.moderators
		: await tx
				.select({ userId: projectModerator.userId })
				.from(projectModerator)
				.where(eq(projectModerator.projectId, project.id));
	const filters = rankingFilters(
		config,
		project.id,
		staffUserIds(project, moderatorRows),
	);

	const [row] = await tx
		.select({ amount: count() })
		.from(participantPoints)
		.innerJoin(
			participant,
			eq(participant.id, participantPoints.participantId),
		)
		.where(and(...filters));

	return Number(row?.amount ?? 0);
}

/** Top do ranking público (opt-outs e staff aplicados). */
export async function loadRanking(
	tx: GamificationClient,
	project: GamificationProject,
	limit: number,
): Promise<{ rows: RankingRow[]; total: number }> {
	const config = projectConfig(project);
	const moderatorRows = project.moderators
		? project.moderators
		: await tx
				.select({ userId: projectModerator.userId })
				.from(projectModerator)
				.where(eq(projectModerator.projectId, project.id));
	const filters = rankingFilters(
		config,
		project.id,
		staffUserIds(project, moderatorRows),
	);

	const [rows, totalRow] = await Promise.all([
		tx
			.select({
				participantId: participant.id,
				shortId: participant.shortId,
				name: user.name,
				avatarUrl: user.image_url,
				points: participantPoints.total,
			})
			.from(participantPoints)
			.innerJoin(
				participant,
				eq(participant.id, participantPoints.participantId),
			)
			.innerJoin(user, eq(participant.userId, user.id))
			.where(and(...filters))
			.orderBy(
				desc(participantPoints.total),
				asc(participant.joinedAt),
				asc(participant.id),
			)
			.limit(limit),
		tx
			.select({ amount: count() })
			.from(participantPoints)
			.innerJoin(
				participant,
				eq(participant.id, participantPoints.participantId),
			)
			.where(and(...filters)),
	]);

	return {
		rows: rows.map((row, index) => ({ ...row, rank: index + 1 })),
		total: Number(totalRow[0]?.amount ?? 0),
	};
}

/** Adesivos concedidos manualmente (admin). */
export async function grantSticker(
	tx: Tx,
	input: {
		projectId: string;
		participantId: string;
		stickerKey: string;
		awardedByUserId: string;
	},
): Promise<{ granted: boolean }> {
	const inserted = await tx
		.insert(participantSticker)
		.values({
			projectId: input.projectId,
			participantId: input.participantId,
			stickerKey: input.stickerKey,
			source: "manual",
			awardedByUserId: input.awardedByUserId,
		})
		.onConflictDoNothing()
		.returning({ stickerKey: participantSticker.stickerKey });
	return { granted: inserted.length > 0 };
}
