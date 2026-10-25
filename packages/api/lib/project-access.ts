import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import { and, eq, inArray, type SQL } from "@verific/drizzle/orm";
import { activity, participant, project } from "@verific/drizzle/schema";

/**
 * Canonical organizer check for a single event: the caller must be the
 * owner or a moderator. Unknown events fail with NOT_FOUND, non-members
 * with FORBIDDEN — identical to the historical per-router copies this
 * replaces, so no caller behavior changes.
 */
export async function requireProjectAccess(projectId: string, userId: string) {
	const data = await db.query.project.findFirst({
		where: eq(project.id, projectId),
		with: { moderators: { columns: { userId: true } } },
	});
	if (!data) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Evento não encontrado.",
		});
	}
	const isOwner = data.ownerId === userId;
	const isModerator = data.moderators.some((m) => m.userId === userId);
	if (!isOwner && !isModerator) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Sem permissão neste evento.",
		});
	}
	return data;
}

/**
 * Owner-only check for irreversible operations (event deletion).
 * Moderators keep every other power; only ownership deletes.
 */
export async function requireProjectOwner(projectId: string, userId: string) {
	const data = await requireProjectAccess(projectId, userId);
	if (data.ownerId !== userId) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Apenas o dono do evento pode excluir.",
		});
	}
	return data;
}

/** `requireProjectAccess` for the event that owns the activity. */
export async function requireActivityAccess(
	activityId: string,
	userId: string,
) {
	const found = await db.query.activity.findFirst({
		where: eq(activity.id, activityId),
		columns: { projectId: true },
	});
	if (!found) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Atividade não encontrada.",
		});
	}
	await requireProjectAccess(found.projectId, userId);
	return { projectId: found.projectId };
}

async function hasAccessWhere(where: SQL, userId: string) {
	const data = await db.query.project.findFirst({
		where,
		columns: { ownerId: true },
		with: { moderators: { columns: { userId: true } } },
	});
	if (!data) return false;
	return (
		data.ownerId === userId ||
		data.moderators.some((m) => m.userId === userId)
	);
}

/** Boolean organizer check, for callers that degrade instead of failing. */
export function hasProjectAccess(projectId: string, userId: string) {
	return hasAccessWhere(eq(project.id, projectId), userId);
}

export function hasProjectAccessByUrl(projectUrl: string, userId: string) {
	return hasAccessWhere(eq(project.url, projectUrl), userId);
}

/** Whether `userId` is the participant behind this public profile. */
export async function ownsParticipantProfile(
	projectId: string,
	shortId: string,
	userId: string,
) {
	const found = await db.query.participant.findFirst({
		where: and(
			eq(participant.projectId, projectId),
			eq(participant.shortId, shortId),
			eq(participant.userId, userId),
		),
		columns: { id: true },
	});
	return Boolean(found);
}

/**
 * Every id must be a participant of the event (FORBIDDEN otherwise). Ids
 * must be unique: the input schemas dedupe them.
 */
export async function requireParticipantsInProject(
	projectId: string,
	participantIds: string[],
) {
	const found = await db
		.select({ id: participant.id })
		.from(participant)
		.where(
			and(
				eq(participant.projectId, projectId),
				inArray(participant.id, participantIds),
			),
		);
	if (found.length !== participantIds.length) {
		throw new TRPCError({
			message: "Participants must belong to the activity project.",
			code: "FORBIDDEN",
		});
	}
}
