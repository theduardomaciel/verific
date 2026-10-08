/**
 * Regra da fila de espera, sem banco: dado o estado de uma atividade,
 * decide quais ofertas expiram, quem recebe oferta e quem sai da fila
 * porque a atividade acabou. `settleActivity` aplica o resultado.
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

export function planSettlement(input: SettlementInput): SettlementPlan {
	const { limit, enrolled, entries, now, startsAt, endsAt, offerHours } =
		input;

	if (endsAt && now >= endsAt) {
		return { expire: entries.map((entry) => entry.id), offer: [] };
	}

	const expired = entries.filter(
		(entry) =>
			entry.status === "offered" &&
			(!entry.offerExpiresAt || entry.offerExpiresAt <= now),
	);
	const expiredIds = new Set(expired.map((entry) => entry.id));
	const openOffers = entries.filter(
		(entry) => entry.status === "offered" && !expiredIds.has(entry.id),
	).length;

	// Depois do início, só o organizador promove (manualmente)
	if (startsAt && now >= startsAt) {
		return { expire: [...expiredIds], offer: [] };
	}

	const free =
		limit == null ? Infinity : Math.max(0, limit - enrolled - openOffers);
	const deadline = Math.min(
		now.getTime() + offerHours * HOUR,
		startsAt?.getTime() ?? Infinity,
	);

	const offer = entries
		.filter((entry) => entry.status === "waiting")
		.sort(byQueueOrder)
		.slice(0, free)
		.map((entry) => ({ id: entry.id, expiresAt: new Date(deadline) }));

	return { expire: [...expiredIds], offer };
}
