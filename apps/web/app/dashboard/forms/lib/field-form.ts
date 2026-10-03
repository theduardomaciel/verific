import { z } from "@verific/zod";
import { formFieldTypes } from "@verific/api/schemas";
import { groupFieldsIntoRows } from "@/lib/forms/layout";
import type { Field } from "../types";

export const fieldFormSchema = z.object({
	fieldId: z.string().optional(),
	label: z.string().min(1, "Obrigatório").max(200),
	type: z.enum(formFieldTypes),
	helpText: z.string().max(500).optional(),
	required: z.boolean().default(false),
	optionsText: z.string().optional(),
	min: z.string().optional(),
	max: z.string().optional(),
	minLength: z.string().optional(),
	maxLength: z.string().optional(),
	isVisible: z.boolean().default(true),
	editableAfterSignup: z.boolean().default(true),
	halfWidth: z.boolean().default(false),
	sectionId: z.string().min(1, "Obrigatório").nullable().optional(),
});

export type FieldFormValues = z.infer<typeof fieldFormSchema>;

export function defaultFieldValues(initial?: Field, defaultSectionId?: string | null): FieldFormValues {
	return {
		fieldId: initial?.id,
		label: initial?.label ?? "",
		type: (initial?.type as FieldFormValues["type"]) ?? "text",
		helpText: initial?.helpText ?? "",
		required: initial?.required ?? true,
		optionsText: (initial?.options ?? []).join("\n"),
		min: initial?.validation?.min?.toString() ?? "",
		max: initial?.validation?.max?.toString() ?? "",
		minLength: initial?.validation?.minLength?.toString() ?? "",
		maxLength: initial?.validation?.maxLength?.toString() ?? "",
		isVisible: initial?.isVisible ?? true,
		editableAfterSignup: initial?.editableAfterSignup ?? true,
		halfWidth: initial?.halfWidth ?? false,
		sectionId: initial?.sectionId ?? defaultSectionId ?? null,
	} as FieldFormValues;
}

export function needsOptionsFor(type: FieldFormValues["type"]): boolean {
	return type === "select_single" || type === "select_multiple";
}

interface UpsertFieldInput {
	versionId: string;
	fieldId?: string;
	label: string;
	type: FieldFormValues["type"];
	helpText: string | null;
	required: boolean;
	options?: string[];
	validation?: Record<string, unknown>;
	isVisible: boolean;
	editableAfterSignup: boolean;
	halfWidth: boolean;
	sectionId?: string | null;
}

export function toUpsertFieldInput(
	versionId: string,
	values: FieldFormValues,
): UpsertFieldInput {
	const num = (v?: string) => (v && v.trim() !== "" ? Number(v) : undefined);
	const needsOptions = needsOptionsFor(values.type);
	const options =
		needsOptions && values.optionsText
			? values.optionsText
					.split("\n")
					.map((s) => s.trim())
					.filter(Boolean)
			: undefined;
	const validation =
		values.type === "number"
			? { min: num(values.min), max: num(values.max) }
			: values.type === "text" ||
				  values.type === "textarea" ||
				  values.type === "email"
				? {
						minLength: num(values.minLength),
						maxLength: num(values.maxLength),
					}
				: undefined;
	return {
		versionId,
		fieldId: values.fieldId,
		label: values.label,
		type: values.type,
		helpText: values.helpText || null,
		required: values.required,
		options,
		validation,
		isVisible: values.isVisible,
		editableAfterSignup: values.editableAfterSignup,
		halfWidth: values.halfWidth,
		sectionId: values.sectionId ?? null,
	};
}

/**
 * Live hint describing which row the field will land in when
 * "Meia largura" is toggled (full row vs. split with neighbour).
 */
export function buildRowHint(args: {
	siblings?: Pick<Field, "id" | "label" | "halfWidth">[];
	position?: number | null;
	initialId?: string;
	halfWidth: boolean;
}): string | null {
	const { siblings, position, initialId, halfWidth } = args;
	if (!siblings || position === undefined || position === null) return null;
	if (!halfWidth) return null;
	const hypothetical = siblings.map((s) => ({
		id: s.id,
		halfWidth: s.halfWidth ?? false,
	}));
	const selfId = initialId ?? "__new__";
	if (initialId) {
		const idx = hypothetical.findIndex((s) => s.id === initialId);
		if (idx >= 0) hypothetical[idx] = { id: selfId, halfWidth: true };
	} else {
		hypothetical.splice(Math.min(position, hypothetical.length), 0, {
			id: selfId,
			halfWidth: true,
		});
	}
	const rows = groupFieldsIntoRows(hypothetical);
	const row = rows.find((r) => r.fields.some((f) => f.id === selfId));
	if (!row) return null;
	if (row.orphan || row.fields.length < 2) {
		return "Atenção: ficará sozinha e ocupará a linha inteira — ative “Meia largura” no campo vizinho para dividir a linha.";
	}
	const partner = row.fields.find((f) => f.id !== selfId);
	const partnerLabel = siblings.find((s) => s.id === partner?.id)?.label;
	return partnerLabel
		? `Vai dividir a linha com “${partnerLabel}”.`
		: "Vai dividir a linha com o campo vizinho.";
}
