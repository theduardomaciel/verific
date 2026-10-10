/**
 * Detecção pura de conflitos de horário entre atividades.
 *
 * Módulo client-safe (só tipos + datas, sem `db` nem server env):
 * pode ser importado de `"use client"` via `@verific/api/schedule-conflicts`
 * e é a única implementação da regra — mapa do cliente, máquina de
 * estados e checagem do servidor usam esta função.
 *
 * Convenção de tempo: igual à de `lib/date` na web — a comparação usa o
 * instante absoluto (`getTime()`), que independe de fuso; a formatação
 * continua com os helpers pt-BR de lá. Nenhuma segunda convenção aqui.
 */

export interface ConflictSessionLike {
	startsAt: Date;
	endsAt?: Date | null;
}

export interface ConflictActivityLike<
	S extends ConflictSessionLike = ConflictSessionLike,
> {
	id: string;
	name: string;
	/** Carga horária da atividade **em horas** (mesma unidade do
	 * cadastro e do card): usada só quando a sessão não tem fim. */
	workload?: number | null;
	/**
	 * Escape hatch simétrico: par ignorado quando o alvo OU a inscrita
	 * tem `true`. Ausente/`null`/`false` = sem exceção.
	 */
	allowOverlap?: boolean | null;
	sessions?: S[] | null;
}

export interface Conflict<
	T extends ConflictSessionLike = ConflictSessionLike,
	O extends ConflictSessionLike = ConflictSessionLike,
> {
	otherActivity: { id: string; name: string };
	otherSession: O;
	targetSession: T;
}

const toTime = (value: Date): number => new Date(value).getTime();

/**
 * Fim efetivo da sessão em ms. Sem `endsAt`: estima com a carga horária
 * (horas → ms); sem carga útil, a sessão é um ponto (retorna `null`).
 */
function resolveEnd(
	session: ConflictSessionLike,
	workload: number | null | undefined,
): number | null {
	if (session.endsAt !== undefined && session.endsAt !== null) {
		return toTime(session.endsAt);
	}
	if (workload !== undefined && workload !== null && workload > 0) {
		return toTime(session.startsAt) + workload * 3_600_000;
	}
	return null;
}

function intervalsOverlap(
	startA: number,
	endA: number | null,
	startB: number,
	endB: number | null,
): boolean {
	// Intervalo × intervalo: estrito para back-to-back não conflitar.
	if (endA !== null && endB !== null) {
		return startA < endB && startB < endA;
	}
	// Ponto × intervalo: só conflita estritamente dentro do outro.
	// Ponto × ponto nunca conflita (ponto não tem interior).
	if (endA === null && endB !== null) return startB < startA && startA < endB;
	if (endB === null && endA !== null) return startA < startB && startB < endA;
	return false;
}

/**
 * Conflitos do alvo contra as atividades inscritas: uma entrada por par
 * de sessões sobrepostas, ordenada pelo início. Ignora o próprio alvo,
 * pares com `allowOverlap` em qualquer um dos lados, atividades
 * inscritas já encerradas e sessões inscritas já encerradas.
 * Pura: o "agora" vem por parâmetro, sem `new Date()` aqui dentro.
 */
export function findScheduleConflicts<
	T extends ConflictSessionLike,
	O extends ConflictSessionLike,
>(
	target: ConflictActivityLike<T>,
	enrolled: ConflictActivityLike<O>[],
	now: Date,
): Conflict<T, O>[] {
	const nowTime = now.getTime();
	const targetSessions = target.sessions ?? [];
	if (targetSessions.length === 0) return [];

	const conflicts: Conflict<T, O>[] = [];

	for (const other of enrolled) {
		if (other.id === target.id) continue;
		// Escape hatch simétrico: basta um dos lados permitir.
		if (target.allowOverlap || other.allowOverlap) continue;
		const otherSessions = other.sessions ?? [];
		if (otherSessions.length === 0) continue;

		const otherEnds = otherSessions.map((s) =>
			resolveEnd(s, other.workload),
		);
		// Atividade inscrita com todas as sessões encerradas: ignora.
		// Sessão-ponto (fim desconhecido) nunca conta como encerrada.
		// Limite igual ao de `hasEverySessionEnded`: encerrou ⟺ now > fim.
		const hasLiveSession = otherEnds.some(
			(end) => end === null || end >= nowTime,
		);
		if (!hasLiveSession) continue;

		for (let oi = 0; oi < otherSessions.length; oi += 1) {
			const otherSession = otherSessions[oi]!;
			const otherEnd = otherEnds[oi]!;
			if (otherEnd !== null && nowTime > otherEnd) continue;

			for (const targetSession of targetSessions) {
				const targetStart = toTime(targetSession.startsAt);
				const targetEnd = resolveEnd(targetSession, target.workload);
				if (
					intervalsOverlap(
						targetStart,
						targetEnd,
						toTime(otherSession.startsAt),
						otherEnd,
					)
				) {
					conflicts.push({
						otherActivity: { id: other.id, name: other.name },
						otherSession,
						targetSession,
					});
				}
			}
		}
	}

	return conflicts.sort(
		(a, b) =>
			toTime(a.targetSession.startsAt) -
				toTime(b.targetSession.startsAt) ||
			toTime(a.otherSession.startsAt) - toTime(b.otherSession.startsAt),
	);
}
