import { z } from "@verific/zod";
import {
	isValidPhoneNumber,
	parsePhoneNumberFromString,
} from "libphonenumber-js";

import { activityAudiences } from "@verific/drizzle/enum/audience";
import { activityCategories } from "@verific/drizzle/enum/category";
import { formFieldTypes } from "@verific/drizzle/enum/form-field-type";
import { participantRoles } from "@verific/drizzle/enum/role";

import {
	createEnumArraySchema,
	sortOptions,
} from "./utils";

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
});

export const getParticipantsParams = z.object({
	query: z.string().optional(),
	sort: z.enum(sortOptions).optional(),
	page: z.coerce.number().default(0),
	pageSize: z.coerce.number().default(10),
	role: z.array(z.enum(participantRoles)).optional(),
});

export { formFieldTypes };

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
	options: formFieldOptionsSchema,
	validation: formFieldValidationSchema,
	isVisible: z.boolean().default(true),
	editableAfterSignup: z.boolean().default(true),
});

export type UpsertFormFieldInput = z.infer<typeof upsertFormFieldInput>;

export const answerValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.array(z.string()),
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
	validation?: {
		min?: number | null;
		max?: number | null;
		minLength?: number | null;
		maxLength?: number | null;
	} | null;
	isVisible: boolean;
	isActive: boolean;
};

function fieldValueSchema(field: FormFieldForValidation) {
	let base: z.ZodTypeAny;

	switch (field.type) {
		case "text": {
			base = z.string();
			const v = field.validation;
			if (typeof v?.minLength === "number")
				base = (base as z.ZodString).min(v.minLength);
			if (typeof v?.maxLength === "number")
				base = (base as z.ZodString).max(v.maxLength);
			break;
		}
		case "textarea": {
			base = z.string();
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
		case "select_single": {
			if (field.options && field.options.length > 0) {
				base = z.enum(field.options as [string, ...string[]]);
			} else {
				base = z.string().min(1);
			}
			break;
		}
		case "select_multiple": {
			if (field.options && field.options.length > 0) {
				const opt = z.enum(field.options as [string, ...string[]]);
				base = z.array(opt);
			} else {
				base = z.array(z.string().min(1));
			}
			break;
		}
		case "checkbox": {
			base = z.coerce.boolean();
			break;
		}
		case "email": {
			let emailBase = z.string();
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
				.string()
				.refine((val) => val === "" || isValidPhoneNumber(val), {
					message: "Telefone inválido.",
				});
			break;
		}
		default:
			base = z.string();
	}

	if (!field.required) {
		return base.optional().nullable().transform((v) => {
			if (v === "" || v === null) return undefined;
			if (Array.isArray(v) && v.length === 0) return undefined;
			return v;
		});
	}

	if (field.type === "text" || field.type === "textarea") {
		return (base as z.ZodString).min(1, { message: "Obrigatório" });
	}
	if (field.type === "email" || field.type === "phone") {
		// Base is a ZodEffects (refine), so require non-empty via refine
		// instead of .min() to keep the "Obrigatório" message for blanks.
		return base.refine((v) => typeof v === "string" && v.trim().length > 0, {
			message: "Obrigatório",
		});
	}
	if (field.type === "select_multiple") {
		return (base as z.ZodArray<any>).min(1, { message: "Obrigatório" });
	}
	if (field.type === "checkbox") {
		return z.literal(true, { message: "Obrigatório" });
	}
	return base;
}

export function buildAnswersSchema(fields: FormFieldForValidation[]) {
	const shape: Record<string, z.ZodTypeAny> = {};
	for (const field of fields) {
		if (!field.isActive || !field.isVisible) continue;
		shape[field.key] = fieldValueSchema(field);
	}
	return z.object(shape);
}

export function validateAnswers(
	fields: FormFieldForValidation[],
	answers: Record<string, unknown>,
): { success: boolean; errors?: Record<string, string[]>; data?: Record<string, unknown> } {
	const schema = buildAnswersSchema(fields);
	const parsed = schema.safeParse(answers);
	if (parsed.success) return { success: true, data: parsed.data };
	const flat = parsed.error.flatten();
	const errors: Record<string, string[]> = {};
	for (const [key, messages] of Object.entries(flat.fieldErrors)) {
		if (messages) errors[key] = messages;
	}
	return { success: false, errors };
}

export function formatAnswerValue(
	type: FormFieldForValidation["type"],
	value: unknown,
): string {
	if (value === null || value === undefined || value === "") return "";
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
