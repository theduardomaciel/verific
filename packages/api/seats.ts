import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import {
	and,
	asc,
	count,
	eq,
	exists,
	gt,
	inArray,
	sql,
} from "@verific/drizzle/orm";
import {
	activity,
	activityWaitlist,
	participant,
	participantOnActivity,
} from "@verific/drizzle/schema";

import type { ActiveEntry } from "./waitlist";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Numa rajada, quem espera a trava segura uma conexão do pool: passado este
// prazo, desiste e a devolve
const LOCK_TIMEOUT = "5s";
// `lock_not_available`, lançado quando o `lock_timeout` estoura
const LOCK_NOT_AVAILABLE = "55P03";

function isLockTimeout(error: unknown) {
	for (let e = error, depth = 0; e && depth < 5; depth++) {
		if ((e as { code?: unknown }).code === LOCK_NOT_AVAILABLE) return true;
		e = (e as { cause?: unknown }).cause;
	}
	return false;
}

/**
 * Transação para inscrições disputadas: espera no máximo `LOCK_TIMEOUT`
 * pelas travas e, se estourar, recusa com `BUSY` para a pessoa tentar de
 * novo.
 */
export async function contendedTransaction<T>(
	work: (tx: Tx) => Promise<T>,
): Promise<T> {
	try {
		return await db.transaction(async (tx) => {
			await tx.execute(
				sql`SELECT set_config('lock_timeout', ${LOCK_TIMEOUT}, true)`,
			);
			return work(tx);
		});
	} catch (error) {
		if (!isLockTimeout(error)) throw error;
		throw new TRPCError({
			message: "Muita gente se inscrevendo agora. Tente de novo.",
			code: "TOO_MANY_REQUESTS",
			cause: { code: "BUSY" },
		});
	}
}

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
			projectId: activity.projectId,
			participantsLimit: activity.participantsLimit,
			waitlistEnabled: activity.waitlistEnabled,
			waitlistOfferHours: activity.waitlistOfferHours,
			waitlistOfferMinutes: activity.waitlistOfferMinutes,
			cancelledAt: activity.cancelledAt,
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

/** Recusa ocupar vaga em atividade cancelada; liberar vaga continua valendo. */
export function assertActivityOpen(
	locked: Pick<LockedActivity, "cancelledAt">,
) {
	if (locked.cancelledAt) {
		throw new TRPCError({
			message: "Activity was cancelled.",
			code: "BAD_REQUEST",
			cause: { code: "REGISTRATION_CLOSED" },
		});
	}
}

/**
 * Oferta da fila ainda dentro do prazo. Uma oferta vencida deixa de ocupar
 * vaga mesmo antes de `settleActivity` marcá-la como `expired`.
 */
export function openOfferWhere(now = new Date()) {
	return and(
		eq(activityWaitlist.status, "offered"),
		gt(activityWaitlist.offerExpiresAt, now),
	);
}

export async function countEnrolled(tx: Tx, activityId: string) {
	const [row] = await tx
		.select({ amount: count() })
		.from(participantOnActivity)
		.where(
			and(
				eq(participantOnActivity.activityId, activityId),
				eq(participantOnActivity.role, "participant"),
				eq(participantOnActivity.noShow, false),
			),
		);
	return row?.amount ?? 0;
}

/**
 * Com a atividade travada e a fila acertada (`queue`, de `settleActivity`),
 * diz se há vaga para quem ainda não tem vínculo com ela. Ofertas em aberto
 * ocupam vaga, exceto a da própria pessoa. Com `queueFirst`, quem não tem
 * oferta também não passa à frente de quem espera.
 *
 * `queued` são os que, entre os novos, estavam na fila.
 */
export async function checkSeats(
	tx: Tx,
	locked: LockedActivity,
	queue: Pick<ActiveEntry, "participantId" | "status">[],
	participantIds: string[],
	{
		queueFirst = false,
		allowOverCapacity = false,
	}: { queueFirst?: boolean; allowOverCapacity?: boolean } = {},
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
	if (newcomers.length === 0) return { ok: true, queued: [] };

	const isNewcomer = (id: string) => newcomers.includes(id);
	const queued = queue.map((entry) => entry.participantId).filter(isNewcomer);
	const othersOffers = queue.filter(
		(entry) =>
			entry.status === "offered" && !isNewcomer(entry.participantId),
	).length;

	// A organização pode furar a fila e o limite de vagas de propósito
	// (overbooking); nesse caso as duas checagens são ignoradas, mas quem já
	// estava na fila continua sendo resolvido como promoção.
	if (allowOverCapacity) return { ok: true, queued };

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
		if (othersWaiting && !newcomers.every(holdsOffer)) {
			return { ok: false, queued };
		}
	}

	if (locked.participantsLimit != null) {
		const enrolled = await countEnrolled(tx, locked.id);
		const free = locked.participantsLimit - enrolled - othersOffers;
		if (newcomers.length > free) return { ok: false, queued };
	}

	return { ok: true, queued };
}

function activityFullError() {
	return new TRPCError({
		message: "Adding these participants exceeds the activity limit.",
		code: "BAD_REQUEST",
		cause: { code: "ACTIVITY_FULL" },
	});
}

/** Como `checkSeats`, mas recusa com `ACTIVITY_FULL` e devolve `queued`. */
export async function assertSeatsAvailable(
	...args: Parameters<typeof checkSeats>
) {
	const { ok, queued } = await checkSeats(...args);
	if (!ok) throw activityFullError();
	return queued;
}

/**
 * Limpa a marcação de overbooking das inscrições que agora cabem no limite.
 * Mantém a flag apenas para o excesso real (últimas inscritas), preservando
 * a auditoria de quem ainda está acima da capacidade.
 */
export async function normalizeOverbooked(
	tx: Tx,
	activityId: string,
	limit: number | null,
) {
	if (limit == null) return;
	const overbookedRows = await tx
		.select({
			participantId: participantOnActivity.participantId,
		})
		.from(participantOnActivity)
		.where(
			and(
				eq(participantOnActivity.activityId, activityId),
				eq(participantOnActivity.role, "participant"),
				eq(participantOnActivity.noShow, false),
				eq(participantOnActivity.overbooked, true),
			),
		)
		.orderBy(asc(participantOnActivity.subscribedAt));
	const totalActive = await countEnrolled(tx, activityId);
	const excess = Math.max(0, totalActive - limit);
	if (overbookedRows.length <= excess) return;
	const toClear = overbookedRows
		.slice(0, overbookedRows.length - excess)
		.map((row) => row.participantId);
	if (toClear.length === 0) return;
	await tx
		.update(participantOnActivity)
		.set({
			overbooked: false,
			overbookReason: null,
			overbookedByUserId: null,
			overbookedAt: null,
		})
		.where(
			and(
				eq(participantOnActivity.activityId, activityId),
				inArray(participantOnActivity.participantId, toClear),
			),
		);
}

/**
 * Lotação da atividade vista sem trava, como colunas a somar à leitura do
 * participante (`participant.id`), sem ida a mais ao banco. `involved` diz
 * se ele já tem vínculo ou lugar na fila.
 */
export function occupancyColumns(activityId: string, now = new Date()) {
	const linked = db
		.select({ one: sql`1` })
		.from(participantOnActivity)
		.where(
			and(
				eq(participantOnActivity.activityId, activityId),
				eq(participantOnActivity.participantId, participant.id),
			),
		);
	const queued = db
		.select({ one: sql`1` })
		.from(activityWaitlist)
		.where(
			and(
				eq(activityWaitlist.activityId, activityId),
				eq(activityWaitlist.participantId, participant.id),
				inArray(activityWaitlist.status, ["waiting", "offered"]),
			),
		);
	return {
		involved: sql<boolean>`(${exists(linked)} or ${exists(queued)})`,
		enrolled: db.$count(
			participantOnActivity,
			and(
				eq(participantOnActivity.activityId, activityId),
				eq(participantOnActivity.role, "participant"),
				eq(participantOnActivity.noShow, false),
			),
		),
		openOffers: db.$count(
			activityWaitlist,
			and(
				eq(activityWaitlist.activityId, activityId),
				openOfferWhere(now),
			),
		),
	};
}

/**
 * Recusa antes da trava quem chega sem vínculo nem lugar na fila a uma
 * atividade já cheia, para a rajada de quem não vai conseguir vaga não
 * esperar por ela. Ofertas vencidas não contam, então só recusa a mais
 * quando alguém libera a vaga no mesmo instante; a checagem sob a trava
 * continua valendo para quem passa.
 */
export function assertNotFullBeforeLock(
	found: Pick<LockedActivity, "participantsLimit" | "cancelledAt">,
	occupancy: { involved: boolean; enrolled: number; openOffers: number },
) {
	// Cancelada: a checagem sob a trava responde com o motivo certo
	if (found.participantsLimit == null || found.cancelledAt) return;
	if (occupancy.involved) return;
	if (occupancy.enrolled + occupancy.openOffers >= found.participantsLimit) {
		throw activityFullError();
	}
}
