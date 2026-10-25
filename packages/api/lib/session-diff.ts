/**
 * Diff de sessões de atividade.
 *
 * O bug original recriava todas as sessões a cada edição: como
 * `session_attendances` cai em cascata, qualquer edição de nome apagava os
 * check-ins e deixava os pontos das sessões antigas órfãos.
 *
 * A regra aqui é reaproveitar a linha existente sempre que possível —
 * primeiro pelo `id` (o formulário envia o id das sessões já salvas) e,
 * como fallback para clientes antigos, pelo conteúdo (horário + local). Só
 * o que não casou vira insert/delete.
 */

export interface SessionRow {
	id: string;
	startsAt: Date;
	endsAt: Date;
	address?: string | null;
}

export interface SessionInput {
	id?: string;
	startsAt: Date;
	endsAt: Date;
	address?: string | null;
}

export interface SessionDiffPlan {
	/** Sessões existentes que devem ser atualizadas no lugar. */
	toUpdate: Array<{
		id: string;
		startsAt: Date;
		endsAt: Date;
		address?: string | null;
	}>;
	toInsert: SessionInput[];
	toDeleteIds: string[];
}

function contentKey(session: SessionInput): string {
	return [
		session.startsAt.getTime(),
		session.endsAt.getTime(),
		session.address?.trim() ?? "",
	].join("|");
}

export function planSessionDiff(
	existing: SessionRow[],
	next: SessionInput[],
): SessionDiffPlan {
	const byId = new Map(existing.map((session) => [session.id, session]));
	const byContent = new Map<string, SessionRow>();
	for (const session of existing) {
		// Duas sessões idênticas em conteúdo são impossíveis (o schema
		// proíbe sobreposição), mas o primeiro vence para o mapa ser estável.
		if (!byContent.has(contentKey(session))) {
			byContent.set(contentKey(session), session);
		}
	}

	const used = new Set<string>();
	const toUpdate: SessionDiffPlan["toUpdate"] = [];
	const pending: SessionInput[] = [];

	// 1. Casamento explícito por id.
	for (const session of next) {
		const match = session.id ? byId.get(session.id) : undefined;
		if (match && !used.has(match.id)) {
			used.add(match.id);
			toUpdate.push({
				id: match.id,
				startsAt: session.startsAt,
				endsAt: session.endsAt,
				address: session.address,
			});
			continue;
		}
		pending.push(session);
	}

	// 2. Fallback por conteúdo (cliente que não envia ids).
	const toInsert: SessionInput[] = [];
	for (const session of pending) {
		const match = byContent.get(contentKey(session));
		if (match && !used.has(match.id)) {
			used.add(match.id);
			// Conteúdo idêntico: nada a atualizar, só preservar a linha.
			continue;
		}
		toInsert.push(session);
	}

	const toDeleteIds = existing
		.filter((session) => !used.has(session.id))
		.map((session) => session.id);

	return { toUpdate, toInsert, toDeleteIds };
}
