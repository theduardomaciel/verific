import { eq, inArray } from "@verific/drizzle/orm";
import {
	activity,
	eventLog,
	participant,
	user,
	type EventLogType,
} from "@verific/drizzle/schema";

import type { Tx } from "../seats";

type Metadata = Record<string, unknown>;

export type RecordEventArgs = {
	projectId: string;
	type: EventLogType;
	activityId?: string | null;
	participantId?: string | null;
	actorUserId?: string | null;
	/** Snapshots; resolvidos do banco quando ausentes. */
	activityName?: string | null;
	participantName?: string | null;
	actorName?: string | null;
	metadata?: Metadata;
};

async function participantNames(tx: Tx, ids: string[]) {
	if (ids.length === 0) return new Map<string, string>();
	const rows = await tx
		.select({ id: participant.id, name: user.name })
		.from(participant)
		.innerJoin(user, eq(user.id, participant.userId))
		.where(inArray(participant.id, ids));
	return new Map(rows.map((row) => [row.id, row.name]));
}

async function activityNames(tx: Tx, ids: string[]) {
	if (ids.length === 0) return new Map<string, string>();
	const rows = await tx
		.select({ id: activity.id, name: activity.name })
		.from(activity)
		.where(inArray(activity.id, ids));
	return new Map(rows.map((row) => [row.id, row.name]));
}

async function userNames(tx: Tx, ids: string[]) {
	if (ids.length === 0) return new Map<string, string>();
	const rows = await tx
		.select({ id: user.id, name: user.name })
		.from(user)
		.where(inArray(user.id, ids));
	return new Map(rows.map((row) => [row.id, row.name ?? ""]));
}

async function resolveMissing(
	tx: Tx,
	args: Pick<
		RecordEventArgs,
		"activityId" | "activityName" | "participantId" | "participantName"
	> & { actorUserId?: string | null; actorName?: string | null },
) {
	const [activityMap, participantMap, actorMap] = await Promise.all([
		args.activityId && !args.activityName
			? activityNames(tx, [args.activityId])
			: new Map<string, string>(),
		args.participantId && !args.participantName
			? participantNames(tx, [args.participantId])
			: new Map<string, string>(),
		args.actorUserId && !args.actorName
			? userNames(tx, [args.actorUserId])
			: new Map<string, string>(),
	]);
	return {
		activityName:
			args.activityName ??
			(args.activityId
				? (activityMap.get(args.activityId) ?? null)
				: null),
		participantName:
			args.participantName ??
			(args.participantId
				? (participantMap.get(args.participantId) ?? null)
				: null),
		actorName:
			args.actorName ??
			(args.actorUserId
				? (actorMap.get(args.actorUserId) ?? null)
				: null),
	};
}

/** Registra uma ação no log do evento (dentro da transação da ação). */
export async function recordEvent(tx: Tx, args: RecordEventArgs) {
	const names = await resolveMissing(tx, args);
	await tx.insert(eventLog).values({
		projectId: args.projectId,
		type: args.type,
		activityId: args.activityId ?? null,
		participantId: args.participantId ?? null,
		actorUserId: args.actorUserId ?? null,
		activityName: names.activityName,
		participantName: names.participantName,
		actorName: names.actorName,
		metadata: args.metadata ?? {},
	});
}

/**
 * Registra a mesma ação para vários participantes (ex.: fila de espera),
 * resolvendo projectId e nomes em lote.
 */
export async function recordParticipantEvents(
	tx: Tx,
	args: {
		projectId?: string;
		activityId: string;
		type: EventLogType;
		actorUserId?: string | null;
		activityName?: string | null;
		actorName?: string | null;
		metadata?: Metadata;
	},
	participantIds: string[],
) {
	if (participantIds.length === 0) return;

	const [projectId, names] = await Promise.all([
		args.projectId
			? Promise.resolve(args.projectId)
			: activityProjectId(tx, args.activityId),
		participantNames(tx, participantIds),
	]);
	const [activityMap, actorMap] = await Promise.all([
		args.activityName
			? Promise.resolve(new Map<string, string>())
			: activityNames(tx, [args.activityId]),
		args.actorUserId && !args.actorName
			? userNames(tx, [args.actorUserId])
			: Promise.resolve(new Map<string, string>()),
	]);
	const activityName =
		args.activityName ?? activityMap.get(args.activityId) ?? null;
	const actorName =
		args.actorName ??
		(args.actorUserId ? (actorMap.get(args.actorUserId) ?? null) : null);

	await tx.insert(eventLog).values(
		participantIds.map((participantId) => ({
			projectId,
			type: args.type,
			activityId: args.activityId,
			participantId,
			actorUserId: args.actorUserId ?? null,
			activityName,
			participantName: names.get(participantId) ?? null,
			actorName,
			metadata: args.metadata ?? {},
		})),
	);
}

async function activityProjectId(tx: Tx, activityId: string) {
	const [row] = await tx
		.select({ projectId: activity.projectId })
		.from(activity)
		.where(eq(activity.id, activityId));
	if (!row) throw new Error("Atividade não encontrada para o log.");
	return row.projectId;
}
