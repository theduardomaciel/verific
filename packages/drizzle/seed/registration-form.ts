import { COURSES } from "./factories";

import type * as schema from "../schema";
import type { Faker } from "@faker-js/faker";

type FieldInsert = typeof schema.formField.$inferInsert;
type AnswerInsert = typeof schema.formAnswer.$inferInsert;

// Os campos que antes ficavam no participante, agora como formulário publicado
export const REGISTRATION_FIELDS = [
	{ key: "matricula", label: "Matrícula", type: "text", required: true },
	{
		key: "curso",
		label: "Curso",
		type: "select_single",
		required: true,
		options: [...COURSES],
	},
	{
		key: "periodo",
		label: "Período",
		type: "select_single",
		required: false,
		options: Array.from({ length: 10 }, (_, i) => String(i + 1)),
	},
	{
		key: "nivel",
		label: "Nível",
		type: "radio_group",
		required: false,
		options: ["Graduação", "Pós-graduação", "Técnico"],
	},
] as const satisfies Pick<
	FieldInsert,
	"key" | "label" | "type" | "required" | "options"
>[];

export type RegistrationAnswers = Record<
	(typeof REGISTRATION_FIELDS)[number]["key"],
	string
>;

export function buildRegistrationForm(
	faker: Faker,
	params: { projectId: string; createdBy: string; publishedAt: Date },
) {
	const version = {
		id: faker.string.uuid(),
		projectId: params.projectId,
		version: 1,
		isPublished: true,
		createdBy: params.createdBy,
		publishedAt: params.publishedAt,
	} satisfies typeof schema.formVersion.$inferInsert;

	const section = {
		id: faker.string.uuid(),
		formVersionId: version.id,
		projectId: params.projectId,
		title: "Dados da inscrição",
		order: 0,
	} satisfies typeof schema.formSection.$inferInsert;

	const fields = REGISTRATION_FIELDS.map(
		(field, order) =>
			({
				id: faker.string.uuid(),
				formVersionId: version.id,
				projectId: params.projectId,
				sectionId: section.id,
				order,
				...field,
				options: "options" in field ? [...field.options] : null,
			}) satisfies FieldInsert,
	);

	return { version, section, fields };
}

// Matrícula única por evento: o índice do participante entra no número
export function buildRegistrationAnswers(
	faker: Faker,
	index: number,
): RegistrationAnswers {
	return {
		matricula: String(10_000_000 + index),
		curso: faker.helpers.arrayElement(COURSES),
		periodo: String(faker.number.int({ min: 1, max: 10 })),
		nivel: faker.helpers.arrayElement([
			"Graduação",
			"Pós-graduação",
			"Técnico",
		]),
	};
}

// Mesmo formato que a API grava ao receber `submitAnswers`
export function buildAnswerRows(params: {
	participantId: string;
	projectId: string;
	form: ReturnType<typeof buildRegistrationForm>;
	answers: RegistrationAnswers;
}): AnswerInsert[] {
	return params.form.fields.map((field) => ({
		participantId: params.participantId,
		fieldId: field.id,
		formVersionId: params.form.version.id,
		projectId: params.projectId,
		valueText: params.answers[field.key as keyof RegistrationAnswers],
		fieldSnapshot: {
			key: field.key,
			label: field.label,
			type: field.type,
			required: field.required,
			options: field.options,
			allowOther: false,
		},
	}));
}
