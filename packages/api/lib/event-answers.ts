import { db } from "@verific/drizzle";
import { and, desc, eq, isNull } from "@verific/drizzle/orm";
import { formAnswer, formField, formVersion } from "@verific/drizzle/schema";

type Reader = Pick<typeof db, "select">;

type StoredValue = Pick<
	typeof formAnswer.$inferSelect,
	"valueJson" | "valueNumber" | "valueDate" | "valueText"
>;

export function answerToValue(row: StoredValue): unknown {
	if (row.valueJson !== null && row.valueJson !== undefined)
		return row.valueJson;
	if (row.valueNumber !== null && row.valueNumber !== undefined)
		return row.valueNumber;
	if (row.valueDate !== null && row.valueDate !== undefined)
		return row.valueDate;
	return row.valueText;
}

/**
 * Respostas do participante ao formulário do evento, em todas as versões,
 * da mais recente para a mais antiga. As dos formulários de atividade ficam
 * de fora: as chaves só são únicas dentro de cada formulário.
 */
export async function eventAnswerRows(participantId: string, tx: Reader = db) {
	const rows = await tx
		.select({
			fieldId: formAnswer.fieldId,
			key: formField.key,
			valueText: formAnswer.valueText,
			valueNumber: formAnswer.valueNumber,
			valueDate: formAnswer.valueDate,
			valueJson: formAnswer.valueJson,
		})
		.from(formAnswer)
		.innerJoin(formField, eq(formField.id, formAnswer.fieldId))
		.innerJoin(formVersion, eq(formVersion.id, formAnswer.formVersionId))
		.where(
			and(
				eq(formAnswer.participantId, participantId),
				isNull(formVersion.activityId),
			),
		)
		.orderBy(desc(formAnswer.updatedAt), desc(formVersion.version));
	return rows.map(({ key, fieldId, ...value }) => ({
		key,
		fieldId,
		value: answerToValue(value),
	}));
}

/** A resposta mais recente de cada pergunta do formulário do evento. */
export function latestByKey(
	rows: Array<{ key: string; value: unknown }>,
): Map<string, unknown> {
	const byKey = new Map<string, unknown>();
	for (const row of rows) {
		if (!byKey.has(row.key)) byKey.set(row.key, row.value);
	}
	return byKey;
}
