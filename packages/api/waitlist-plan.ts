/**
 * Regra da fila de espera, sem banco: dado o estado de uma atividade,
 * decide quais ofertas expiram, quais voltam para a fila, quem recebe oferta
 * e quem sai da fila porque a atividade acabou. `settleActivity` aplica o
 * resultado.
 */

export interface WaitlistEntryState {
	id: string;
	participantId: string;
	status: "waiting" | "offered";
	joinedAt: Date;
	offerExpiresAt: Date | null;
}

export interface SettlementInput {
	/** `null` = sem limite de vagas. */
	limit: number | null;
	/** Inscritos com papel `participant`. */
	enrolled: number;
	/** Entradas ativas da fila (`waiting` e `offered`). */
	entries: WaitlistEntryState[];
	now: Date;
	/** Início da primeira sessão e fim da última (`null` sem sessões). */
	startsAt: Date | null;
	endsAt: Date | null;
	offerHours: number;
}

export interface SettlementPlan {
	/** Ofertas vencidas e entradas encerradas pelo fim da atividade. */
	expire: string[];
	/** Ofertas vigentes acima do limite (o limite baixou): voltam a esperar. */
	revoke: string[];
	offer: { id: string; expiresAt: Date }[];
}

const HOUR = 60 * 60 * 1000;

/** Ordem da fila: entrada mais antiga primeiro; o id desempata. */
export function byQueueOrder(
	a: Pick<WaitlistEntryState, "id" | "joinedAt">,
	b: Pick<WaitlistEntryState, "id" | "joinedAt">,
) {
	return (
		a.joinedAt.getTime() - b.joinedAt.getTime() || a.id.localeCompare(b.id)
	);
}

/**
 * Vagas tomadas para quem ainda não tem vínculo com a atividade: inscritos,
 * ofertas vigentes e as vagas livres que a fila vai receber no próximo
 * acerto (quem espera passa na frente). Ofertas vencidas não entram.
 */
export function seatsTaken({
	limit,
	enrolled,
	openOffers,
	waiting,
}: {
	limit: number | null;
	enrolled: number;
	openOffers: number;
	waiting: number;
}): number {
	const held = enrolled + openOffers;
	if (limit == null) return held;
	return held + Math.min(waiting, Math.max(0, limit - held));
}

export function planSettlement(input: SettlementInput): SettlementPlan {
	const { limit, enrolled, entries, now, startsAt, endsAt, offerHours } =
		input;

	if (endsAt && now >= endsAt) {
		return {
			expire: entries.map((entry) => entry.id),
			revoke: [],
			offer: [],
		};
	}

	const expired = entries.filter(
		(entry) =>
			entry.status === "offered" &&
			(!entry.offerExpiresAt || entry.offerExpiresAt <= now),
	);
	const expiredIds = new Set(expired.map((entry) => entry.id));
	const openOffers = entries
		.filter(
			(entry) => entry.status === "offered" && !expiredIds.has(entry.id),
		)
		.sort(byQueueOrder);

	// Com o limite menor, as últimas ofertas da fila são desfeitas
	const seatsForOffers =
		limit == null ? Infinity : Math.max(0, limit - enrolled);
	const revoke = openOffers.slice(seatsForOffers).map((entry) => entry.id);

	// Depois do início, só o organizador promove (manualmente)
	if (startsAt && now >= startsAt) {
		return { expire: [...expiredIds], revoke, offer: [] };
	}

	const free = Math.max(0, seatsForOffers - openOffers.length);
	const deadline = Math.min(
		now.getTime() + offerHours * HOUR,
		startsAt?.getTime() ?? Infinity,
	);

	const offer = entries
		.filter((entry) => entry.status === "waiting")
		.sort(byQueueOrder)
		.slice(0, free)
		.map((entry) => ({ id: entry.id, expiresAt: new Date(deadline) }));

	return { expire: [...expiredIds], revoke, offer };
}
