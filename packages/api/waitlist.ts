import type { db } from "@verific/drizzle";
import { and, eq, inArray, max, min } from "@verific/drizzle/orm";
import {
	activitySession,
	activityWaitlist,
	activityWaitlistEvent,
	type WaitlistEventType,
} from "@verific/drizzle/schema";

import { deleteActivityAnswers } from "./enrollment";
import {
	notifyActivityWaitlistOffered,
	notifyActivityWaitlistOfferRevoked,
} from "./notifications";
import {
	countEnrolled,
	normalizeOverbooked,
	type LockedActivity,
	type Tx,
} from "./seats";
import { byQueueOrder, planSettlement } from "./waitlist-plan";

const ACTIVE = ["waiting", "offered"] as const;

async function recordEvents(
	tx: Tx,
	activityId: string,
	participantIds: string[],
	type: WaitlistEventType,
	actorUserId: string | null,
	reason?: string | null,
) {
	if (participantIds.length === 0) return;
	await tx.insert(activityWaitlistEvent).values(
		participantIds.map((participantId) => ({
			activityId,
			participantId,
			type,
			actorUserId,
			reason: reason ?? null,
		})),
	);
}

export type ActiveEntry = {
	id: string;
	participantId: string;
	status: (typeof ACTIVE)[number];
	joinedAt: Date;
	offerExpiresAt: Date | null;
};

export type EffectiveEntry = {
	id: string;
	participantId: string;
	status: "waiting" | "offered" | "expired";
	joinedAt: Date;
	offerExpiresAt: Date | null;
};

const entryColumns = {
	id: activityWaitlist.id,
	participantId: activityWaitlist.participantId,
	status: activityWaitlist.status,
	joinedAt: activityWaitlist.joinedAt,
	offerExpiresAt: activityWaitlist.offerExpiresAt,
};

export async function getActiveEntries(tx: Tx, activityId: string) {
	return tx
		.select(entryColumns)
		.from(activityWaitlist)
		.where(
			and(
				eq(activityWaitlist.activityId, activityId),
				inArray(activityWaitlist.status, [...ACTIVE]),
			),
		) as Promise<ActiveEntry[]>;
}

/**
 * Reads active waitlist entries and computes their EFFECTIVE status
 * based on offerExpiresAt vs. now, WITHOUT modifying the database.
 * This is for read-only handlers (UI, API) that need the current state
 * without the side effects of settleActivity.
 */
export async function getEffectiveEntries(
	tx: Tx,
	activityId: string,
	now = new Date(),
): Promise<EffectiveEntry[]> {
	const queues = await getEffectiveEntriesByActivity(tx, [activityId], now);
	return queues.get(activityId) ?? [];
}

/** `getEffectiveEntries` de várias atividades numa leitura só. */
export async function getEffectiveEntriesByActivity(
	tx: Tx | typeof db,
	activityIds: string[],
	now = new Date(),
): Promise<Map<string, EffectiveEntry[]>> {
	const rows = (await tx
		.select({ activityId: activityWaitlist.activityId, ...entryColumns })
		.from(activityWaitlist)
		.where(
			and(
				inArray(activityWaitlist.activityId, activityIds),
				inArray(activityWaitlist.status, [...ACTIVE]),
			),
		)) as Array<ActiveEntry & { activityId: string }>;
	const byActivity = new Map<string, EffectiveEntry[]>();
	for (const { activityId, ...entry } of rows) {
		const queue = byActivity.get(activityId) ?? [];
		// If offered but expired, treat as expired for display purposes
		queue.push(
			entry.status === "offered" &&
				entry.offerExpiresAt &&
				entry.offerExpiresAt <= now
				? { ...entry, status: "expired" }
				: entry,
		);
		byActivity.set(activityId, queue);
	}
	return byActivity;
}

/** Início da primeira sessão e fim da última (`null` sem sessões). */
export async function getActivityRange(tx: Tx, activityId: string) {
	const [range] = await tx
		.select({
			startsAt: min(activitySession.startsAt),
			endsAt: max(activitySession.endsAt),
		})
		.from(activitySession)
		.where(eq(activitySession.activityId, activityId));
	return {
		startsAt: range?.startsAt ? new Date(range.startsAt) : null,
		endsAt: range?.endsAt ? new Date(range.endsAt) : null,
	};
}

/** Posição de cada pessoa que espera (1 = próxima), pela ordem da fila. */
export function queuePositions(entries: (ActiveEntry | EffectiveEntry)[]) {
	return new Map(
		entries
			.filter((entry) => entry.status === "waiting")
			.sort(byQueueOrder)
			.map((entry, i) => [entry.participantId, i + 1]),
	);
}

/**
 * Acerta a fila da atividade já travada: expira ofertas vencidas e oferece
 * as vagas livres aos próximos. Chamado por mutações (saída, remoção, promoção,
 * mudança de limite, cancelamento) e pelo handler de expiração agendado.
 * Devolve a fila já acertada.
 */
export async function settleActivity(
	tx: Tx,
	locked: LockedActivity,
	now = new Date(),
): Promise<ActiveEntry[]> {
	const entries = await getActiveEntries(tx, locked.id);
	if (entries.length === 0) return entries;

	const range = await getActivityRange(tx, locked.id);

	const plan = planSettlement({
		limit: locked.participantsLimit,
		enrolled: await countEnrolled(tx, locked.id),
		entries,
		now,
		...range,
		offerHours: locked.waitlistOfferHours,
		offerMinutes: locked.waitlistOfferMinutes,
	});

	const participantOf = (ids: string[]) =>
		entries
			.filter((entry) => ids.includes(entry.id))
			.map((entry) => entry.participantId);

	if (plan.expire.length > 0) {
		await tx
			.update(activityWaitlist)
			.set({ status: "expired", resolvedAt: now })
			.where(inArray(activityWaitlist.id, plan.expire));
		const expired = participantOf(plan.expire);
		await deleteActivityAnswers(tx, locked.id, expired);
		await recordEvents(tx, locked.id, expired, "expired", null);
	}

	if (plan.revoke.length > 0) {
		await tx
			.update(activityWaitlist)
			.set({ status: "waiting", offeredAt: null, offerExpiresAt: null })
			.where(inArray(activityWaitlist.id, plan.revoke));
		await recordEvents(
			tx,
			locked.id,
			participantOf(plan.revoke),
			"revoked",
			null,
		);
		// Como a oferta: o e-mail é validado depois do commit
		void notifyActivityWaitlistOfferRevoked({
			eventId: locked.projectId,
			activityId: locked.id,
			revoked: entries
				.filter((entry) => plan.revoke.includes(entry.id))
				.map((entry) => ({
					participantId: entry.participantId,
					enrollmentId: entry.id,
				})),
			revokedAt: now,
		});
	}

	// Todas as ofertas de uma rodada têm o mesmo prazo
	const offerIds = plan.offer.map((offer) => offer.id);
	if (plan.offer.length > 0) {
		await tx
			.update(activityWaitlist)
			.set({
				status: "offered",
				offeredAt: now,
				offerExpiresAt: plan.offer[0]!.expiresAt,
			})
			.where(inArray(activityWaitlist.id, offerIds));
		await recordEvents(
			tx,
			locked.id,
			participantOf(offerIds),
			"offered",
			null,
		);

		// Every new offer comes from a settle, so this is the only place that
		// sees them all. Fire-and-forget: the e-mail is built and validated
		// after the transaction commits, and a rolled back settlement is later
		// skipped by `validate`.
		const expiresById = new Map(
			plan.offer.map((offer) => [offer.id, offer.expiresAt]),
		);
		void notifyActivityWaitlistOffered({
			eventId: locked.projectId,
			activityId: locked.id,
			offers: entries
				.filter((entry) => expiresById.has(entry.id))
				.map((entry) => ({
					participantId: entry.participantId,
					enrollmentId: entry.id,
					offeredAt: now,
					expiresAt: expiresById.get(entry.id)!,
				})),
		});
	}

	const expired = new Set(plan.expire);
	const revoked = new Set(plan.revoke);
	const offered = new Map(plan.offer.map((o) => [o.id, o.expiresAt]));

	// Capacidade pode ter mudado (remoção, no-show, aumento de limite):
	// quem agora cabe no limite deixa de ser overbooking.
	await normalizeOverbooked(tx, locked.id, locked.participantsLimit);

	return entries
		.filter((entry) => !expired.has(entry.id))
		.map((entry) =>
			offered.has(entry.id)
				? {
						...entry,
						status: "offered" as const,
						offerExpiresAt: offered.get(entry.id)!,
					}
				: revoked.has(entry.id)
					? {
							...entry,
							status: "waiting" as const,
							offerExpiresAt: null,
						}
					: entry,
		);
}

export async function addToWaitlist(
	tx: Tx,
	activityId: string,
	participantId: string,
): Promise<{ id: string }> {
	const [entry] = await tx
		.insert(activityWaitlist)
		.values({ activityId, participantId })
		.returning({ id: activityWaitlist.id });
	if (!entry) {
		throw new Error("Falha ao entrar na fila de espera.");
	}
	await recordEvents(tx, activityId, [participantId], "joined", null);
	return entry;
}

export type ResolvedWaitlistEntry = {
	id: string;
	participantId: string;
	resolvedAt: Date;
};

/**
 * Encerra a entrada de quem acabou de ganhar vaga. `confirmed` quando a
 * própria pessoa confirma; `promoted` quando o organizador inscreve.
 * Devolve apenas as entradas realmente encerradas (uma por pessoa), com o
 * `resolvedAt` usado como escalar de idempotência do e-mail de promoção.
 */
export async function resolveEnrolledEntries(
	tx: Tx,
	activityId: string,
	participantIds: string[],
	event: {
		type: "confirmed" | "promoted";
		actorUserId: string | null;
		reason?: string | null;
	},
): Promise<ResolvedWaitlistEntry[]> {
	if (participantIds.length === 0) return [];

	const resolvedAt = new Date();
	const resolved = await tx
		.update(activityWaitlist)
		.set({ status: "enrolled", resolvedAt })
		.where(
			and(
				eq(activityWaitlist.activityId, activityId),
				inArray(activityWaitlist.participantId, participantIds),
				inArray(activityWaitlist.status, [...ACTIVE]),
			),
		)
		.returning({
			id: activityWaitlist.id,
			participantId: activityWaitlist.participantId,
		});

	await recordEvents(
		tx,
		activityId,
		resolved.map((row) => row.participantId),
		event.type,
		event.actorUserId,
		event.reason,
	);

	return resolved.map((row) => ({
		id: row.id,
		participantId: row.participantId,
		resolvedAt,
	}));
}

/**
 * Tira alguém da fila (saída ou remoção) e apaga as respostas do
 * formulário. Devolve `false` se a pessoa não estava na fila.
 */
export async function closeEntry(
	tx: Tx,
	activityId: string,
	participantId: string,
	event: {
		type: "left" | "removed";
		actorUserId: string | null;
		reason?: string | null;
	},
) {
	const [closed] = await tx
		.update(activityWaitlist)
		.set({ status: event.type, resolvedAt: new Date() })
		.where(
			and(
				eq(activityWaitlist.activityId, activityId),
				eq(activityWaitlist.participantId, participantId),
				inArray(activityWaitlist.status, [...ACTIVE]),
			),
		)
		.returning({ id: activityWaitlist.id });
	if (!closed) return false;

	await deleteActivityAnswers(tx, activityId, [participantId]);
	await recordEvents(
		tx,
		activityId,
		[participantId],
		event.type,
		event.actorUserId,
		event.reason,
	);
	return true;
}
