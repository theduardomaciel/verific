import { formatProfileValue } from "@verific/drizzle/profile-layout";

export interface BadgeAnswerRow {
	participantId: string;
	fieldId: string;
	valueText: string | null;
	valueNumber: number | null;
	valueDate: Date | string | null;
	valueJson: unknown;
	fieldSnapshot: { key?: string } | null;
	updatedAt: Date | string;
	field?: { key?: string } | null;
}

/**
 * Atribui respostas aos campos ligados no layout, devolvendo por
 * participante um mapa chave→valor já formatado.
 *
 * Casa por fieldId (robusto a renomeações de chave entre versões) OU por
 * chave (robusto a respostas dadas em outra versão do formulário).
 * Ganha a resposta mais recente por participante+campo; vazias são
 * descartadas (a display list omite a linha).
 */
export function matchBadgeAnswers(args: {
	answers: BadgeAnswerRow[];
	/** campo ligado id → {chave atual, tipo} */
	boundById: Map<string, { key: string; type: string }>;
}): Map<string, Record<string, string>> {
	const { answers, boundById } = args;
	const keyById = new Map(
		[...boundById].map(([id, f]) => [id, f.key] as const),
	);
	const wantedKeys = new Set([...boundById.values()].map((f) => f.key));
	const typeByKey = new Map(
		[...boundById.values()].map((f) => [f.key, f.type] as const),
	);
	const sorted = [...answers].sort(
		(a, b) =>
			new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);
	const seen = new Set<string>();
	const out = new Map<string, Record<string, string>>();
	for (const row of sorted) {
		const snapKey = row.fieldSnapshot?.key ?? row.field?.key;
		const boundKey =
			keyById.get(row.fieldId) ??
			(snapKey && wantedKeys.has(snapKey) ? snapKey : undefined);
		if (!boundKey) continue;
		const seenKey = `${row.participantId}:${boundKey}`;
		if (seen.has(seenKey)) continue;
		seen.add(seenKey);
		const raw =
			(row.valueJson as unknown) ??
			row.valueNumber ??
			row.valueDate ??
			row.valueText;
		const formatted = formatProfileValue(
			raw,
			typeByKey.get(boundKey) ?? "text",
		);
		if (!formatted) continue;
		let entry = out.get(row.participantId);
		if (!entry) {
			entry = {};
			out.set(row.participantId, entry);
		}
		entry[boundKey] = formatted;
	}
	return out;
}
