import { and, desc, eq, isNull } from "@verific/drizzle/orm";
import { formField, formVersion } from "@verific/drizzle/schema";
import type { SeedDb } from "@verific/drizzle/seed";

type Answer = string | number | boolean | string[];

// Respostas válidas para o formulário publicado do evento (ou de uma
// atividade), para que o teste acompanhe o formulário que o app valida
export async function buildFormAnswers(
	db: SeedDb,
	projectId: string,
	activityId?: string,
) {
	const [version] = await db
		.select({ id: formVersion.id })
		.from(formVersion)
		.where(
			and(
				eq(formVersion.projectId, projectId),
				activityId
					? eq(formVersion.activityId, activityId)
					: isNull(formVersion.activityId),
				eq(formVersion.isPublished, true),
			),
		)
		.orderBy(desc(formVersion.version))
		.limit(1);
	if (!version) return {};

	const fields = await db
		.select({
			key: formField.key,
			type: formField.type,
			required: formField.required,
			options: formField.options,
			validation: formField.validation,
		})
		.from(formField)
		.where(
			and(
				eq(formField.formVersionId, version.id),
				eq(formField.isActive, true),
				eq(formField.isVisible, true),
			),
		);

	const answers: Record<string, Answer> = {};
	for (const field of fields) {
		const value = answerFor(field);
		if (value !== undefined) answers[field.key] = value;
		else if (field.required) {
			throw new Error(
				`Campo obrigatório "${field.key}" (${field.type}) sem resposta automática no teste de carga.`,
			);
		}
	}
	return answers;
}

function answerFor(field: {
	type: string;
	options: string[] | null;
	validation: { min?: number } | null;
}): Answer | undefined {
	const first = field.options?.[0];
	switch (field.type) {
		case "text":
		case "textarea":
			return "Carga";
		case "number":
			return field.validation?.min ?? 1;
		case "checkbox":
			return true;
		case "select_single":
		case "radio_group":
			return first;
		case "select_multiple":
			return first ? [first] : undefined;
		default:
			return undefined;
	}
}
