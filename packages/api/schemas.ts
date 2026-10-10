import {
	isValidPhoneNumber,
	parsePhoneNumberFromString,
} from "libphonenumber-js";

import { activityAudiences } from "@verific/drizzle/enum/audience";
import { activityCategories } from "@verific/drizzle/enum/category";
import { formFieldTypes } from "@verific/drizzle/enum/form-field-type";
import { participantRoles } from "@verific/drizzle/enum/role";
import {
	normalizeSocialLink,
	socialEntrySchema,
	socialServiceById,
} from "@verific/drizzle/profile-layout";
import { z } from "@verific/zod";

import { createEnumArraySchema, sortOptions } from "./utils";

/**
 * Client-safe query param schemas.
 *
 * These schemas contain only zod + enum imports (no `db`, no server env),
 * so they can be imported from `"use client"` components without pulling
 * server-only modules into the browser bundle.
 *
 * Router files re-export from here. Client components must import from
 * `@verific/api/schemas`, never from `@verific/api/routers/*`.
 */

export const activitySort = ["asc", "desc", "name_asc", "name_desc"] as const;

/**
 * Códigos legíveis por máquina para falhas de inscrição em atividades.
 * Viajam no `data.reason` da resposta tRPC (ver `errorFormatter` em
 * `trpc.ts`): o `code` padrão continua sendo `BAD_REQUEST` e as mensagens
 * humanas não mudam — o cliente distingue os casos por este código.
 */
export const JOIN_ERROR_CODES = [
	"FORM_REQUIRED",
	"ACTIVITY_FULL",
	"REGISTRATION_CLOSED",
	"SCHEDULE_CONFLICT",
] as const;

export type JoinErrorCode = (typeof JOIN_ERROR_CODES)[number];

/** Falhas próprias da fila de espera, no mesmo formato. */
export const WAITLIST_ERROR_CODES = [
	"ACTIVITY_ENDED",
	"NO_WAITLIST",
	"WAITLIST_DISABLED",
	"OFFER_EXPIRED",
	"NOT_IN_WAITLIST",
] as const;

export type WaitlistErrorCode = (typeof WAITLIST_ERROR_CODES)[number];

export const getActivityParams = z.object({
	page: z.coerce.number().default(1).optional(),
	pageSize: z.coerce.number().default(5).optional(),
	search: z.string().optional(),
	sort: z.enum(sortOptions).optional(),
});

export const getActivitiesParams = z.object({
	query: z.string().optional(),
	sort: z.enum(activitySort).optional(),
	page: z.coerce.number().default(0).optional(),
	pageSize: z.coerce.number().default(10).optional(),
	category: createEnumArraySchema(activityCategories).optional(),
	audience: createEnumArraySchema(activityAudiences).optional(),
	tagIds: z
		.preprocess((val) => {
			if (typeof val === "string") {
				return val
					.split(",")
					.map((v) => v.trim())
					.filter(Boolean);
			}
			return val;
		}, z.array(z.uuid()))
		.optional(),
});

export const getParticipantsParams = z.object({
	query: z.string().optional(),
	sort: z.enum(sortOptions).optional(),
	page: z.coerce.number().default(0),
	pageSize: z.coerce.number().default(10),
	role: z.array(z.enum(participantRoles)).optional(),
});

/** Fixed palette for activity tags (trails). Stored as hex in `tags.color`. */
export const tagColors = [
	"#ef4444",
	"#f97316",
	"#f59e0b",
	"#eab308",
	"#84cc16",
	"#22c55e",
	"#10b981",
	"#14b8a6",
	"#06b6d4",
	"#0ea5e9",
	"#3b82f6",
	"#8b5cf6",
	"#a855f7",
	"#ec4899",
] as const;

export const tagColorSchema = z.enum(tagColors);

/**
 * Session shape sent to participants (ticket / schedule).
 * `joinedAt` is the current participant's check-in for the session (null when absent).
 * `attendedCount` is the total number of check-ins for the session.
 */
export interface ParticipantActivitySession {
	id: string;
	startsAt: Date;
	endsAt: Date;
	address: string | null;
	joinedAt: Date | null;
	attendedCount: number;
}

export { formFieldTypes };

/** Fixed label for the opt-in "Other" choice on select fields. */
export const OTHER_LABEL = "Outro";
/** Placeholder shown in the free-text input revealed by "Outro". */
export const OTHER_PLACEHOLDER = "Especifique";
/** Max length (in trimmed characters) accepted for custom "Outro" text. */
export const OTHER_TEXT_MAX_LENGTH = 200;
/**
 * Sentinel used only as the `Select` / checkbox value for "Outro" in the UI.
 * It is never persisted: the stored answer is always the custom text as-is
 * (or a regular option). If a stored value isn't in `options`, it is an
 * "Other" answer.
 */
export const OTHER_SENTINEL = "__other__";

/** True when `options` already contain an "Outro" entry (case-insensitive). */
export function hasOutroOption(options: string[] | null | undefined): boolean {
	return (options ?? []).some(
		(o) => o.trim().toLowerCase() === OTHER_LABEL.toLowerCase(),
	);
}

export const formFieldValidationSchema = z
	.object({
		min: z.number().optional(),
		max: z.number().optional(),
		minLength: z.number().int().min(0).optional(),
		maxLength: z.number().int().min(0).optional(),
	})
	.optional();

export const formFieldOptionsSchema = z.array(z.string().min(1)).optional();

export const upsertFormFieldInput = z.object({
	versionId: z.uuid(),
	fieldId: z.uuid().optional(),
	key: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[a-z0-9_]+$/, {
			message: "Use apenas letras minúsculas, números e _",
		})
		.optional(),
	label: z.string().min(1).max(200),
	type: z.enum(formFieldTypes),
	helpText: z.string().max(500).optional().nullable(),
	required: z.boolean().default(false),
	halfWidth: z.boolean().default(false),
	sectionId: z.uuid().nullable().optional(),
	options: formFieldOptionsSchema,
	allowOther: z.boolean().default(false),
	validation: formFieldValidationSchema,
	isVisible: z.boolean().default(true),
	editableAfterSignup: z.boolean().default(true),
});

export type UpsertFormFieldInput = z.infer<typeof upsertFormFieldInput>;

export const upsertFormSectionInput = z.object({
	versionId: z.uuid(),
	sectionId: z.uuid().optional(),
	title: z.string().trim().min(1, "Obrigatório").max(120),
	visibilityRule: z
		.object({
			sourceFieldId: z.uuid(),
			operator: z.enum([
				"is_checked",
				"is_not_checked",
				"equals",
				"includes_any",
				"includes_all",
			]),
			values: z.array(z.string().min(1).max(200)).max(20).optional(),
		})
		.nullable()
		.optional(),
});

export type UpsertFormSectionInput = z.infer<typeof upsertFormSectionInput>;

export type SectionVisibilityRule = NonNullable<
	UpsertFormSectionInput["visibilityRule"]
>;

/** Field types that can trigger a conditional section. */
export const conditionalTriggerTypes = [
	"checkbox",
	"select_single",
	"select_multiple",
	"radio_group",
] as const;

export type ConditionalTriggerType = (typeof conditionalTriggerTypes)[number];

export function isConditionalTriggerType(
	type: string,
): type is ConditionalTriggerType {
	return (conditionalTriggerTypes as readonly string[]).includes(type);
}

export const reorderFormSectionsInput = z.object({
	versionId: z.uuid(),
	orderedIds: z.array(z.uuid()),
});

export const reorderFormFieldsInput = z.object({
	versionId: z.uuid(),
	orderedIds: z.array(z.uuid()),
	sectionIdByField: z.record(z.string(), z.uuid().nullable()).optional(),
});

/**
 * Portable, version-independent description of a form version.
 *
 * Field→section links use the section's `order` (not a database id) and
 * section visibility rules reference the trigger field by `key` (keys are
 * unique per version), so the JSON can be exported from one project and
 * imported into another.
 */
export const formVersionExportSchema = z.object({
	kind: z.literal("verific-form-version"),
	version: z.literal(1),
	exportedAt: z.string().optional(),
	sections: z
		.array(
			z.object({
				title: z.string().trim().min(1).max(120),
				order: z.number().int().min(0),
				visibilityRule: z
					.object({
						sourceFieldKey: z.string().min(1),
						operator: z.enum([
							"is_checked",
							"is_not_checked",
							"equals",
							"includes_any",
							"includes_all",
						]),
						values: z
							.array(z.string().min(1).max(200))
							.max(20)
							.optional(),
					})
					.nullable()
					.optional(),
			}),
		)
		.default([]),
	fields: z.array(
		z.object({
			key: z.string().min(1).max(64),
			label: z.string().min(1).max(200),
			type: z.enum(formFieldTypes),
			helpText: z.string().max(500).nullable().optional(),
			required: z.boolean().default(false),
			halfWidth: z.boolean().default(false),
			order: z.number().int().min(0),
			sectionOrder: z.number().int().min(0).nullable().optional(),
			options: formFieldOptionsSchema,
			allowOther: z.boolean().default(false),
			validation: formFieldValidationSchema.nullable().optional(),
			isVisible: z.boolean().default(true),
			editableAfterSignup: z.boolean().default(true),
			isActive: z.boolean().default(true),
		}),
	),
});

export type FormVersionExport = z.infer<typeof formVersionExportSchema>;

export const answerValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.date(),
	z.array(z.string()),
	z.array(socialEntrySchema),
	z.null(),
	z.undefined(),
]);

export const submitAnswersInput = z.object({
	projectId: z.uuid(),
	name: z.string().min(2),
	answers: z.record(z.string(), answerValueSchema),
});

export type SubmitAnswersInput = z.infer<typeof submitAnswersInput>;

export type FormFieldForValidation = {
	key: string;
	label: string;
	type: (typeof formFieldTypes)[number];
	required: boolean;
	options?: string[] | null;
	allowOther?: boolean | null;
	validation?: {
		min?: number | null;
		max?: number | null;
		minLength?: number | null;
		maxLength?: number | null;
	} | null;
	isVisible: boolean;
	isActive: boolean;
	id?: string;
	sectionId?: string | null;
};

export interface SectionForVisibility {
	id: string;
	visibilityRule?: SectionVisibilityRule | null;
}

/**
 * Pure evaluator for conditional sections. `answer` is the current value
 * of the trigger field keyed by field key (string | string[] | boolean).
 * A null/undefined rule means always visible.
 */
export function evaluateSectionVisibility(
	rule: SectionVisibilityRule | null | undefined,
	answer: unknown,
): boolean {
	if (!rule) return true;
	switch (rule.operator) {
		case "is_checked":
			return answer === true;
		case "is_not_checked":
			return answer !== true;
		case "equals": {
			if (typeof answer !== "string") return false;
			return (rule.values ?? []).includes(answer);
		}
		case "includes_any": {
			if (!Array.isArray(answer)) return false;
			const wanted = new Set(rule.values ?? []);
			return (answer as unknown[]).some((v) => wanted.has(v as string));
		}
		case "includes_all": {
			if (!Array.isArray(answer)) return false;
			const wanted = rule.values ?? [];
			if (wanted.length === 0) return false;
			const have = new Set(answer as string[]);
			return wanted.every((v) => have.has(v));
		}
		default:
			return true;
	}
}

/**
 * Returns the ids of sections visible for `answers` (keyed by field key).
 * Needs a fieldId -> key lookup because rules reference `sourceFieldId`.
 */
export function getVisibleSectionIds<
	S extends SectionForVisibility,
	F extends { id?: string; key: string },
>(sections: S[], fields: F[], answers: Record<string, unknown>): Set<string> {
	const keyById = new Map<string, string>();
	for (const f of fields) {
		if (f.id) keyById.set(f.id, f.key);
	}
	const visible = new Set<string>();
	for (const s of sections) {
		const rule = s.visibilityRule;
		if (!rule) {
			visible.add(s.id);
			continue;
		}
		const key = keyById.get(rule.sourceFieldId);
		visible.add(s.id);
		if (key === undefined) continue;
		if (!evaluateSectionVisibility(rule, answers[key])) {
			visible.delete(s.id);
		}
	}
	return visible;
}

/** Filters a field list down to fields in visible sections. */
export function filterVisibleFields<
	F extends { key: string; id?: string; sectionId?: string | null },
	S extends SectionForVisibility,
>(fields: F[], sections: S[], answers: Record<string, unknown>): F[] {
	if (!sections.some((s) => s.visibilityRule)) return fields;
	const visibleIds = getVisibleSectionIds(sections, fields, answers);
	return fields.filter((f) => {
		if (!f.sectionId) return true;
		if (!sections.some((s) => s.id === f.sectionId)) return true;
		return visibleIds.has(f.sectionId);
	});
}

/** Returns a copy of `answers` without keys belonging to hidden sections. */
export function stripHiddenAnswers(
	answers: Record<string, unknown>,
	hiddenKeys: Set<string> | string[],
): Record<string, unknown> {
	const hidden = hiddenKeys instanceof Set ? hiddenKeys : new Set(hiddenKeys);
	if (hidden.size === 0) return answers;
	const next: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(answers)) {
		if (!hidden.has(k)) next[k] = v;
	}
	return next;
}

export function validateSectionVisibilityRule(args: {
	rule: SectionVisibilityRule | null | undefined;
	sourceField:
		| { id: string; type: string; options?: string[] | null }
		| undefined;
	sectionId?: string | null;
	sourceSectionId?: string | null;
}): string | null {
	const { rule, sourceField, sectionId, sourceSectionId } = args;
	if (!rule) return null;
	if (!sourceField) return "Campo de origem não encontrado nesta versão.";
	if (!isConditionalTriggerType(sourceField.type)) {
		return "O campo de origem deve ser checkbox, seleção única, múltipla seleção ou grupo de rádio.";
	}
	if (
		sectionId &&
		rule.sourceFieldId &&
		sourceSectionId &&
		sourceSectionId === sectionId
	) {
		return "A seção não pode depender de um campo dela mesma.";
	}
	switch (sourceField.type) {
		case "checkbox":
			if (
				rule.operator !== "is_checked" &&
				rule.operator !== "is_not_checked"
			) {
				return "Para checkbox use “está marcado” ou “não está marcado”.";
			}
			break;
		case "select_single":
		case "radio_group":
			if (rule.operator !== "equals")
				return "Para este campo use “é igual a”.";
			if (!rule.values || rule.values.length === 0)
				return "Escolha ao menos um valor.";
			break;
		case "select_multiple":
			if (
				rule.operator !== "includes_any" &&
				rule.operator !== "includes_all"
			) {
				return "Para múltipla seleção use “contém” ou “contém todos”.";
			}
			if (!rule.values || rule.values.length === 0)
				return "Escolha ao menos um valor.";
			break;
		default:
			break;
	}
	if (rule.values && rule.values.length > 0 && sourceField.options) {
		const unknown = rule.values.filter(
			(v) => !sourceField.options!.includes(v),
		);
		if (unknown.length > 0)
			return "A regra contém valores que não existem mais no campo de origem.";
	}
	return null;
}

function fieldValueSchema(field: FormFieldForValidation) {
	let base: z.ZodTypeAny;

	switch (field.type) {
		case "text": {
			base = z.string({ error: "Obrigatório" });
			const v = field.validation;
			if (typeof v?.minLength === "number")
				base = (base as z.ZodString).min(v.minLength);
			if (typeof v?.maxLength === "number")
				base = (base as z.ZodString).max(v.maxLength);
			break;
		}
		case "textarea": {
			base = z.string({ error: "Obrigatório" });
			const v = field.validation;
			if (typeof v?.minLength === "number")
				base = (base as z.ZodString).min(v.minLength);
			if (typeof v?.maxLength === "number")
				base = (base as z.ZodString).max(v.maxLength);
			break;
		}
		case "number": {
			base = z.coerce.number();
			const v = field.validation;
			if (typeof v?.min === "number")
				base = (base as z.ZodCoercedNumber<number>).min(v.min);
			if (typeof v?.max === "number")
				base = (base as z.ZodCoercedNumber<number>).max(v.max);
			break;
		}
		case "date": {
			base = z.coerce.date();
			break;
		}
		case "select_single":
		case "radio_group": {
			const opts =
				field.options && field.options.length > 0
					? field.options
					: null;
			if (!opts) {
				base = z.string({ error: "Obrigatório" }).min(1);
				break;
			}
			const allowOther = field.allowOther === true;
			base = z
				.string({ error: "Obrigatório" })
				.min(1, { message: "Obrigatório" })
				.superRefine((v, ctx) => {
					if (opts.includes(v)) return;
					if (!allowOther) {
						ctx.addIssue({
							code: "custom",
							message: "Opção inválida.",
						});
						return;
					}
					const trimmed = v.trim();
					if (trimmed.length === 0) {
						ctx.addIssue({
							code: "custom",
							message: "Informe o texto de “Outro”.",
						});
					} else if (trimmed.length > OTHER_TEXT_MAX_LENGTH) {
						ctx.addIssue({
							code: "custom",
							message: `Máximo de ${OTHER_TEXT_MAX_LENGTH} caracteres.`,
						});
					}
				});
			break;
		}
		case "select_multiple": {
			const opts =
				field.options && field.options.length > 0
					? field.options
					: null;
			if (!opts) {
				base = z.array(z.string().min(1), { error: "Obrigatório" });
				break;
			}
			const allowOther = field.allowOther === true;
			const element = z
				.string()
				.min(1, { message: "Obrigatório" })
				.superRefine((v, ctx) => {
					if (opts.includes(v)) return;
					if (!allowOther) {
						ctx.addIssue({
							code: "custom",
							message: "Opção inválida.",
						});
						return;
					}
					const trimmed = v.trim();
					if (trimmed.length === 0) {
						ctx.addIssue({
							code: "custom",
							message: "Informe o texto de “Outro”.",
						});
					} else if (trimmed.length > OTHER_TEXT_MAX_LENGTH) {
						ctx.addIssue({
							code: "custom",
							message: `Máximo de ${OTHER_TEXT_MAX_LENGTH} caracteres.`,
						});
					}
				});
			// "Outro" counts as one selection: the custom text is stored
			// as-is as a single array element, so no extra handling needed.
			base = z.array(element, { error: "Obrigatório" });
			break;
		}
		case "checkbox": {
			base = z.coerce.boolean();
			break;
		}
		case "email": {
			let emailBase = z.string({ error: "Obrigatório" });
			const v = field.validation;
			if (typeof v?.minLength === "number")
				emailBase = emailBase.min(v.minLength, {
					message: "E-mail muito curto.",
				});
			if (typeof v?.maxLength === "number")
				emailBase = emailBase.max(v.maxLength, {
					message: "E-mail muito longo.",
				});
			base = emailBase.refine(
				(val) => val === "" || z.email().safeParse(val).success,
				{
					message: "E-mail inválido.",
				},
			);
			break;
		}
		case "phone": {
			// Stored form is always E.164 (e.g. "+5582999991234"), so no
			// default region is needed. See DOCS/i18n.md.
			base = z
				.string({ error: "Obrigatório" })
				.refine((val) => val === "" || isValidPhoneNumber(val), {
					message: "Telefone inválido.",
				});
			break;
		}
		case "social_links": {
			const allowed =
				field.options && field.options.length > 0
					? field.options
					: null;
			const entry = z
				.object({
					service: z.string().min(1),
					value: z.string().min(1).max(300),
				})
				.superRefine((e, ctx) => {
					const service = socialServiceById(e.service);
					if (!service) {
						ctx.addIssue({
							code: "custom",
							message: "Serviço inválido.",
						});
						return;
					}
					if (allowed && !allowed.includes(service.id)) {
						ctx.addIssue({
							code: "custom",
							message: "Serviço inválido.",
						});
						return;
					}
					const url = normalizeSocialLink(service.id, e.value);
					if (!url || !/^https?:\/\//i.test(url)) {
						ctx.addIssue({
							code: "custom",
							message: "Link inválido.",
						});
					}
				})
				.transform((e) => ({
					service: e.service,
					value: normalizeSocialLink(e.service, e.value) ?? e.value,
				}));
			base = z.array(entry, { error: "Obrigatório" }).max(8);
			break;
		}
		default:
			base = z.string();
	}

	if (!field.required) {
		return base
			.optional()
			.nullable()
			.transform((v) => {
				if (v === "" || v === null) return undefined;
				if (Array.isArray(v) && v.length === 0) return undefined;
				return v;
			});
	}

	if (field.type === "text" || field.type === "textarea") {
		// `error` cobre ausência (invalid_type) e vazio (min): sempre "Obrigatório".
		return (base as z.ZodString).min(1, { message: "Obrigatório" });
	}
	if (field.type === "email" || field.type === "phone") {
		// Base is a ZodEffects (refine), so require non-empty via refine
		// instead of .min() to keep the "Obrigatório" message for blanks.
		return base.refine(
			(v) => typeof v === "string" && v.trim().length > 0,
			{
				message: "Obrigatório",
			},
		);
	}
	if (field.type === "select_multiple") {
		return (base as z.ZodArray<any>).min(1, { message: "Obrigatório" });
	}
	if (field.type === "social_links") {
		return (base as z.ZodArray<any>).min(1, { message: "Obrigatório" });
	}
	if (field.type === "checkbox") {
		return z.literal(true, { message: "Obrigatório" });
	}
	return base;
}

export function buildAnswersSchema(
	fields: FormFieldForValidation[],
	sections?: SectionForVisibility[],
	answers?: Record<string, unknown>,
) {
	const effective =
		sections && answers
			? filterVisibleFields(fields, sections, answers)
			: fields;
	const shape: Record<string, z.ZodTypeAny> = {};
	for (const field of effective) {
		if (!field.isActive || !field.isVisible) continue;
		shape[field.key] = fieldValueSchema(field);
	}
	return z.object(shape);
}

export function validateAnswers(
	fields: FormFieldForValidation[],
	answers: Record<string, unknown>,
	sections?: SectionForVisibility[],
): {
	success: boolean;
	errors?: Record<string, string[]>;
	data?: Record<string, unknown>;
} {
	const schema = buildAnswersSchema(fields, sections, answers);
	const parsed = schema.safeParse(
		stripHiddenForValidation(fields, sections, answers),
	);
	if (parsed.success) return { success: true, data: parsed.data };
	const flat = parsed.error.flatten();
	const errors: Record<string, string[]> = {};
	for (const [key, messages] of Object.entries(flat.fieldErrors)) {
		if (messages) errors[key] = messages;
	}
	return { success: false, errors };
}

/**
 * Removes answers for hidden sections before validation so required
 * fields in hidden sections never block submit and spoofed payloads
 * for hidden sections are ignored.
 */
function stripHiddenForValidation(
	fields: FormFieldForValidation[],
	sections: SectionForVisibility[] | undefined,
	answers: Record<string, unknown>,
): Record<string, unknown> {
	if (!sections || !sections.some((s) => s.visibilityRule)) return answers;
	const visible = new Set(
		filterVisibleFields(fields, sections, answers).map((f) => f.key),
	);
	const next: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(answers)) {
		if (visible.has(k) || !fields.some((f) => f.key === k)) next[k] = v;
	}
	// Always keep trigger answers even if their own section logic changes.
	return next;
}

export function formatAnswerValue(
	type: FormFieldForValidation["type"],
	value: unknown,
): string {
	if (value === null || value === undefined || value === "") return "";
	if (type === "social_links" && Array.isArray(value)) {
		return value
			.map((e) => {
				if (typeof e === "object" && e !== null && "value" in e) {
					return String((e as { value: unknown }).value);
				}
				return String(e);
			})
			.join("; ");
	}
	if (Array.isArray(value)) return value.join("; ");
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	if (typeof value === "boolean") return value ? "Sim" : "Não";
	if (typeof value === "number") return String(value);
	if (typeof value === "string") {
		if (type === "date") {
			const d = new Date(value);
			if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
		}
		if (type === "phone" && value !== "") {
			try {
				return (
					parsePhoneNumberFromString(value)?.formatInternational() ??
					value
				);
			} catch {
				return value;
			}
		}
		return value;
	}
	return String(value);
}
