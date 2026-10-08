import { TRPCError } from "@trpc/server";

import type { db } from "@verific/drizzle";
import { and, count, eq, inArray } from "@verific/drizzle/orm";
import { activity, participantOnActivity } from "@verific/drizzle/schema";

import type { ActiveEntry } from "./waitlist";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Trava a atividade até o fim da transação. Toda operação que ocupa ou
 * libera vaga passa por aqui, então a contagem e a escrita não se
 * intercalam. Locks por participante (`lockParticipant`) vêm antes e,
 * com várias atividades, trave-as em ordem de id.
 */
export async function lockActivity(tx: Tx, activityId: string) {
	const [locked] = await tx
		.select({
			id: activity.id,
			participantsLimit: activity.participantsLimit,
			waitlistOfferHours: activity.waitlistOfferHours,
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

export type LockedActivity = Awaited<ReturnType<typeof lockActivity>>;

export async function countEnrolled(tx: Tx, activityId: string) {
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
 * Com a atividade travada e a fila acertada (`queue`, de `settleActivity`), recusa a
 * inscrição de quem ainda não tem vínculo com ela se faltar vaga. Ofertas
 * em aberto ocupam vaga, exceto a da própria pessoa. Com `queueFirst`,
 * quem não tem oferta também não passa à frente de quem espera.
 *
 * Devolve quem, entre os inscritos agora, estava na fila.
 */
export async function assertSeatsAvailable(
	tx: Tx,
	locked: LockedActivity,
	queue: Pick<ActiveEntry, "participantId" | "status">[],
	participantIds: string[],
	{ queueFirst = false } = {},
) {
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
	if (newcomers.length === 0) return [];

	const isNewcomer = (id: string) => newcomers.includes(id);
	const othersOffers = queue.filter(
		(entry) =>
			entry.status === "offered" && !isNewcomer(entry.participantId),
	).length;

	const full = () =>
		new TRPCError({
			message: "Adding these participants exceeds the activity limit.",
			code: "BAD_REQUEST",
			cause: { code: "ACTIVITY_FULL" },
		});

	if (queueFirst) {
		const holdsOffer = (id: string) =>
			queue.some(
				(entry) =>
					entry.participantId === id && entry.status === "offered",
			);
		const othersWaiting = queue.some(
			(entry) =>
				entry.status === "waiting" && !isNewcomer(entry.participantId),
		);
		if (othersWaiting && !newcomers.every(holdsOffer)) throw full();
	}

	if (locked.participantsLimit != null) {
		const enrolled = await countEnrolled(tx, locked.id);
		if (
			newcomers.length >
			locked.participantsLimit - enrolled - othersOffers
		) {
			throw full();
		}
	}

	return queue.map((entry) => entry.participantId).filter(isNewcomer);
}
