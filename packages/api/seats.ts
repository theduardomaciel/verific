import { TRPCError } from "@trpc/server";

import type { db } from "@verific/drizzle";
import { and, count, eq, inArray } from "@verific/drizzle/orm";
import { activity, participantOnActivity } from "@verific/drizzle/schema";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Trava a atividade até o fim da transação. Toda operação que ocupa ou
 * libera vaga passa por aqui, então a contagem e a escrita não se
 * intercalam. Locks por participante (`activity-join:<id>`) vêm antes.
 */
export async function lockActivity(tx: Tx, activityId: string) {
	const [locked] = await tx
		.select({
			id: activity.id,
			participantsLimit: activity.participantsLimit,
		})
		.from(activity)
		.where(eq(activity.id, activityId))
		.for("update");

	if (!locked) {
		throw new TRPCError({
			message: "Activity not found.",
			code: "BAD_REQUEST",
		});
	}
	return locked;
}

export async function countTakenSeats(tx: Tx, activityId: string) {
	const [row] = await tx
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

/**
 * Com a atividade já travada, recusa a inscrição de quem ainda não tem
 * vínculo com ela se não houver vagas para todos.
 */
export async function assertSeatsAvailable(
	tx: Tx,
	locked: Awaited<ReturnType<typeof lockActivity>>,
	participantIds: string[],
) {
	if (locked.participantsLimit == null) return;

	const linked = await tx
		.select({ participantId: participantOnActivity.participantId })
		.from(participantOnActivity)
		.where(
			and(
				eq(participantOnActivity.activityId, locked.id),
				inArray(participantOnActivity.participantId, participantIds),
			),
		);
	const linkedIds = new Set(linked.map((row) => row.participantId));
	const newcomers = participantIds.filter((id) => !linkedIds.has(id));

	const taken = await countTakenSeats(tx, locked.id);
	if (newcomers.length > locked.participantsLimit - taken) {
		throw new TRPCError({
			message: "Adding these participants exceeds the activity limit.",
			code: "BAD_REQUEST",
			cause: { code: "ACTIVITY_FULL" },
		});
	}
}
