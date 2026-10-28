import { and, count, eq, isNotNull, ne, sql } from "@verific/drizzle/orm";
import {
	activity,
	notification,
	participant,
	participantOnActivity,
	sessionAttendance,
} from "@verific/drizzle/schema";
import type { SeedDb } from "@verific/drizzle/seed";

// Regras que devem continuar valendo depois de qualquer carga

export async function findActivitiesOverLimit(db: SeedDb, projectId: string) {
	const enrolled = count(participantOnActivity.participantId);

	return db
		.select({
			name: activity.name,
			limit: activity.participantsLimit,
			enrolled,
		})
		.from(activity)
		.innerJoin(
			participantOnActivity,
			and(
				eq(participantOnActivity.activityId, activity.id),
				eq(participantOnActivity.role, "participant"),
			),
		)
		.where(
			and(
				eq(activity.projectId, projectId),
				isNotNull(activity.participantsLimit),
			),
		)
		.groupBy(activity.id, activity.name, activity.participantsLimit)
		.having(sql`${enrolled} > ${activity.participantsLimit}`);
}

export async function countCrossProjectEnrollments(db: SeedDb) {
	const [row] = await db
		.select({ amount: count() })
		.from(participantOnActivity)
		.innerJoin(
			participant,
			eq(participant.id, participantOnActivity.participantId),
		)
		.innerJoin(activity, eq(activity.id, participantOnActivity.activityId))
		.where(ne(participant.projectId, activity.projectId));
	return row?.amount ?? 0;
}

export async function countEnrolled(db: SeedDb, activityId: string) {
	const [row] = await db
		.select({ amount: count() })
		.from(participantOnActivity)
		.where(
			and(
				eq(participantOnActivity.activityId, activityId),
				eq(participantOnActivity.role, "participant"),
			),
		);
	return row?.amount ?? 0;
}

export async function countPresences(db: SeedDb, sessionId: string) {
	const [row] = await db
		.select({ amount: count() })
		.from(sessionAttendance)
		.where(eq(sessionAttendance.sessionId, sessionId));
	return row?.amount ?? 0;
}

export async function countParticipants(db: SeedDb, projectId: string) {
	const [row] = await db
		.select({ amount: count() })
		.from(participant)
		.where(eq(participant.projectId, projectId));
	return row?.amount ?? 0;
}

// E-mails do evento por estado: mostra se uma rajada deixou envios falhando
export async function countNotificationsByStatus(
	db: SeedDb,
	projectId: string,
) {
	const rows = await db
		.select({ status: notification.status, amount: count() })
		.from(notification)
		.where(eq(notification.eventId, projectId))
		.groupBy(notification.status);
	return Object.fromEntries(rows.map((row) => [row.status, row.amount]));
}
