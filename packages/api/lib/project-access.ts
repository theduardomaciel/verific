import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import { and, eq, inArray, type SQL } from "@verific/drizzle/orm";
import {
	PROJECT_PERMISSIONS,
	resolveProjectPermissions,
	type ProjectMemberRole,
	type ProjectPermission,
} from "@verific/drizzle/permissions";
import { activity, participant, project } from "@verific/drizzle/schema";

const ALL_PERMISSIONS: ProjectPermission[] = [...PROJECT_PERMISSIONS];

export type ProjectAccess = {
	project: NonNullable<Awaited<ReturnType<typeof findProjectRow>>>;
	isOwner: boolean;
	membership: ProjectAccessMembership | null;
	role: ProjectMemberRole | "owner";
	permissions: ProjectPermission[];
};

type ProjectAccessMembership = {
	userId: string;
	role: ProjectMemberRole;
	permissions: ProjectPermission[] | null;
	includeInRanking: boolean;
};

function findProjectRow(projectId: string) {
	return db.query.project.findFirst({
		where: eq(project.id, projectId),
		with: {
			moderators: {
				columns: {
					userId: true,
					role: true,
					permissions: true,
					includeInRanking: true,
				},
			},
		},
	});
}

/**
 * Carrega o evento + vínculo do usuário. `null` quando o evento não existe ou
 * o usuário não é membro. O dono tem todas as permissões implicitamente.
 */
export async function getProjectAccess(
	projectId: string,
	userId: string,
): Promise<ProjectAccess | null> {
	const row = await findProjectRow(projectId);
	if (!row) return null;

	const isOwner = row.ownerId === userId;
	const membership =
		(row.moderators.find((moderator) => moderator.userId === userId) as
			| ProjectAccessMembership
			| undefined) ?? null;

	if (!isOwner && !membership) return null;

	// `role` é NOT NULL no banco; o fallback cobre linhas legadas/mocks.
	const memberRole: ProjectMemberRole = membership?.role ?? "admin";

	return {
		project: row,
		isOwner,
		membership,
		role: isOwner ? "owner" : memberRole,
		permissions: isOwner
			? ALL_PERMISSIONS
			: resolveProjectPermissions(memberRole, membership!.permissions),
	};
}

export function accessHasPermission(
	access: Pick<ProjectAccess, "isOwner" | "permissions">,
	permission: ProjectPermission,
) {
	return access.isOwner || access.permissions.includes(permission);
}

/**
 * Canonical organizer check for a single event: the caller must be the
 * owner or a member of the team (any role). This is the baseline dashboard
 * access; use `requireProjectPermission` for operations that a monitor must
 * not perform.
 */
export async function requireProjectAccess(projectId: string, userId: string) {
	const access = await getProjectAccess(projectId, userId);
	if (!access) {
		// Distinguish unknown events from non-members, matching the historical
		// behavior of the per-router copies this replaces.
		const exists = await db.query.project.findFirst({
			where: eq(project.id, projectId),
			columns: { id: true },
		});
		if (!exists) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Evento não encontrado.",
			});
		}
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Sem permissão neste evento.",
		});
	}
	return access.project;
}

/** Exige uma permissão efetiva (dono sempre passa). */
export async function requireProjectPermission(
	projectId: string,
	userId: string,
	permission: ProjectPermission,
) {
	const access = await getProjectAccess(projectId, userId);
	if (!access) {
		const exists = await db.query.project.findFirst({
			where: eq(project.id, projectId),
			columns: { id: true },
		});
		if (!exists) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Evento não encontrado.",
			});
		}
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Sem permissão neste evento.",
		});
	}
	if (!accessHasPermission(access, permission)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Você não tem permissão para esta ação.",
		});
	}
	return access.project;
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

/** `requireProjectPermission` for the event that owns the activity. */
export async function requireActivityPermission(
	activityId: string,
	userId: string,
	permission: ProjectPermission,
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
	await requireProjectPermission(found.projectId, userId, permission);
	return { projectId: found.projectId };
}

/** Como `requireActivityPermission`, mas aceita qualquer uma das permissões. */
export async function requireActivityAnyPermission(
	activityId: string,
	userId: string,
	permissions: readonly ProjectPermission[],
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
	const access = await getProjectAccess(found.projectId, userId);
	if (!access) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Sem permissão neste evento.",
		});
	}
	if (
		!permissions.some((permission) =>
			accessHasPermission(access, permission),
		)
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Você não tem permissão para esta ação.",
		});
	}
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

export async function hasProjectPermission(
	projectId: string,
	userId: string,
	permission: ProjectPermission,
) {
	const access = await getProjectAccess(projectId, userId);
	return access ? accessHasPermission(access, permission) : false;
}

export async function hasAnyProjectPermission(
	projectId: string,
	userId: string,
	permissions: readonly ProjectPermission[],
) {
	const access = await getProjectAccess(projectId, userId);
	return access
		? permissions.some((permission) =>
				accessHasPermission(access, permission),
			)
		: false;
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
