import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import { eq } from "@verific/drizzle/orm";
import { project } from "@verific/drizzle/schema";

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
