import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	or,
} from "@verific/drizzle/orm";
import { socialServiceById } from "@verific/drizzle/profile-layout";
import {
	activity,
	formAnswer,
	formField,
	formSection,
	formVersion,
	participant,
	project,
	user,
} from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import {
	dropVisibilityForFields,
	remapProfileLinksOnClone,
	removeProfileLinksForFields,
	slotForField,
	isCompatible,
	readProjectLayout,
} from "../lib/profile-links";
import {
	answerValueSchema,
	filterVisibleFields,
	formVersionExportSchema,
	hasOutroOption,
	isConditionalTriggerType,
	reorderFormFieldsInput,
	reorderFormSectionsInput,
	submitAnswersInput,
	upsertFormFieldInput,
	upsertFormSectionInput,
	validateAnswers,
	validateSectionVisibilityRule,
	type FormFieldForValidation,
} from "../schemas";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { generateShortId } from "./profiles";

export async function requireProjectAccess(projectId: string, userId: string) {
	const data = await db.query.project.findFirst({
		where: eq(project.id, projectId),
		with: {
			moderators: { columns: { userId: true } },
		},
	});
	if (!data) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Evento não encontrado.",
		});
	}
	const isOwner = data.ownerId === userId;
	const isModerator = data.moderators.some((m) => m.userId === userId);
	if (!isOwner && !isModerator) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Sem permissão neste evento.",
		});
	}
	return data;
}

/** Matches versions of one scope: event form (null) or a specific activity. */
function versionScope(activityId?: string | null) {
	return activityId
		? eq(formVersion.activityId, activityId)
		: isNull(formVersion.activityId);
}

async function requireActivityInProject(activityId: string, projectId: string) {
	const found = await db.query.activity.findFirst({
		where: and(
			eq(activity.id, activityId),
			eq(activity.projectId, projectId),
		),
		columns: { id: true },
	});
	if (!found) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Atividade não pertence a este evento.",
		});
	}
	return found;
}

async function resolveProjectId(input: {
	projectId?: string;
	projectUrl?: string;
}) {
	if (input.projectId) return input.projectId;
	if (input.projectUrl) {
		const found = await db.query.project.findFirst({
			where: eq(project.url, input.projectUrl),
			columns: { id: true },
		});
		if (!found) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Evento não encontrado.",
			});
		}
		return found.id;
	}
	throw new TRPCError({
		code: "BAD_REQUEST",
		message: "projectId ou projectUrl é obrigatório.",
	});
}

export function toValidationFields(
	fields: (typeof formField.$inferSelect)[],
): FormFieldForValidation[] {
	return fields.map((f) => ({
		id: f.id,
		sectionId: f.sectionId,
		key: f.key,
		label: f.label,
		type: f.type,
		required: f.required,
		options: f.options,
		allowOther: f.allowOther ?? false,
		validation: f.validation,
		isVisible: f.isVisible,
		isActive: f.isActive,
	}));
}

export function toVisibilitySections(
	sections: (typeof formSection.$inferSelect)[],
): {
	id: string;
	visibilityRule: {
		sourceFieldId: string;
		operator:
			| "is_checked"
			| "is_not_checked"
			| "equals"
			| "includes_any"
			| "includes_all";
		values?: string[];
	} | null;
}[] {
	return sections.map((s) => ({
		id: s.id,
		visibilityRule: (s.visibilityRule ?? null) as {
			sourceFieldId: string;
			operator:
				| "is_checked"
				| "is_not_checked"
				| "equals"
				| "includes_any"
				| "includes_all";
			values?: string[];
		} | null,
	}));
}

function mapValueToColumns(type: string, value: unknown) {
	if (value === undefined || value === null || value === "") return null;
	if (Array.isArray(value)) return { valueJson: value };
	switch (type) {
		case "number": {
			const n = typeof value === "number" ? value : Number(value);
			if (Number.isNaN(n)) return null;
			return { valueNumber: n };
		}
		case "date": {
			const d = value instanceof Date ? value : new Date(value as string);
			if (Number.isNaN(d.getTime())) return null;
			return { valueDate: d };
		}
		case "checkbox": {
			const b =
				value === true ||
				value === "true" ||
				value === 1 ||
				value === "1";
			return { valueJson: b };
		}
		default:
			return { valueText: String(value) };
	}
}

function answerToValue(row: typeof formAnswer.$inferSelect): unknown {
	if (row.valueJson !== null && row.valueJson !== undefined)
		return row.valueJson;
	if (row.valueNumber !== null && row.valueNumber !== undefined)
		return row.valueNumber;
	if (row.valueDate !== null && row.valueDate !== undefined)
		return row.valueDate;
	return row.valueText;
}

/** Latest published version of a scope (event or activity) with active fields + sections. */
export async function getPublishedVersionWithFields(
	projectId: string,
	activityId?: string | null,
) {
	const version = await db.query.formVersion.findFirst({
		where: and(
			eq(formVersion.projectId, projectId),
			versionScope(activityId),
			eq(formVersion.isPublished, true),
		),
		orderBy: desc(formVersion.version),
	});
	if (!version) return { version: null, fields: [], sections: [] };
	const [fields, sections] = await Promise.all([
		db.query.formField.findMany({
			where: and(
				eq(formField.formVersionId, version.id),
				eq(formField.isActive, true),
			),
			orderBy: asc(formField.order),
		}),
		db.query.formSection.findMany({
			where: eq(formSection.formVersionId, version.id),
			orderBy: asc(formSection.order),
		}),
	]);
	return { version, fields, sections };
}

/**
 * "Existe formulário publicado com ao menos um campo visível e ativo":
 * o `hasForm` servido em `getActivities`/`getActivity` para o quick join.
 * Espelha a definição do formulário de inscrição (versão publicada mais
 * recente; visibilidade como no cliente, sobre campos ativos).
 */
export async function hasPublishedActivityForm(
	projectId: string,
	activityId: string,
): Promise<boolean> {
	const version = await db.query.formVersion.findFirst({
		where: and(
			eq(formVersion.projectId, projectId),
			eq(formVersion.activityId, activityId),
			eq(formVersion.isPublished, true),
		),
		orderBy: desc(formVersion.version),
		columns: { id: true },
	});
	if (!version) return false;
	const rows = await db
		.select({ amount: count() })
		.from(formField)
		.where(
			and(
				eq(formField.formVersionId, version.id),
				eq(formField.isActive, true),
				eq(formField.isVisible, true),
			),
		);
	return (rows[0]?.amount ?? 0) > 0;
}

/** Builds answer rows (with snapshots + typed columns) for already-validated data. */
export function buildAnswerRows(args: {
	participantId: string;
	projectId: string;
	versionId: string;
	fields: (typeof formField.$inferSelect)[];
	sections: (typeof formSection.$inferSelect)[];
	data: Record<string, unknown>;
}) {
	const { participantId, projectId, versionId, fields, sections, data } =
		args;
	const validationFields = toValidationFields(fields);
	const visibilitySections = toVisibilitySections(sections);
	const visibleFields = filterVisibleFields(
		validationFields,
		visibilitySections,
		data,
	);
	const visibleKeys = new Set(visibleFields.map((f) => f.key));
	const rows = [];
	for (const field of fields) {
		if (!field.isVisible) continue;
		if (!visibleKeys.has(field.key)) continue;
		const raw = data[field.key];
		if (raw === undefined) continue;
		const mapped = mapValueToColumns(field.type, raw);
		if (!mapped) continue;
		rows.push({
			participantId,
			fieldId: field.id,
			formVersionId: versionId,
			projectId,
			fieldSnapshot: {
				key: field.key,
				label: field.label,
				type: field.type,
				required: field.required,
				options: field.options,
				allowOther: field.allowOther,
			},
			...mapped,
		});
	}
	return rows;
}

function slugifyKey(label: string): string {
	const slug = label
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 48);
	return slug || "campo";
}

async function resolveUniqueKey(
	versionId: string,
	base: string,
	excludeFieldId?: string,
): Promise<string> {
	const existing = await db.query.formField.findMany({
		where: eq(formField.formVersionId, versionId),
		columns: { id: true, key: true },
	});
	const taken = new Set(
		existing.filter((f) => f.id !== excludeFieldId).map((f) => f.key),
	);
	if (!taken.has(base)) return base;
	for (let i = 2; i < 1000; i++) {
		const candidate = `${base}_${i}`.slice(0, 64);
		if (!taken.has(candidate)) return candidate;
	}
	return `${base}_${Date.now().toString(36)}`.slice(0, 64);
}

/** Copies sections + fields (+ visibility rules) from one version to another. */
async function cloneVersionContents(
	newVersionId: string,
	sourceVersionId: string,
	projectId: string,
) {
	const sourceSections = await db.query.formSection.findMany({
		where: eq(formSection.formVersionId, sourceVersionId),
		orderBy: asc(formSection.order),
	});
	const sectionIdMap = new Map<string, string>();
	for (const s of sourceSections) {
		const inserted = await db
			.insert(formSection)
			.values({
				formVersionId: newVersionId,
				projectId,
				title: s.title,
				order: s.order,
				visibilityRule: s.visibilityRule ?? null,
			})
			.returning({ id: formSection.id });
		if (inserted[0]) sectionIdMap.set(s.id, inserted[0].id);
	}
	const sourceFields = await db.query.formField.findMany({
		where: eq(formField.formVersionId, sourceVersionId),
	});
	const fieldIdMap = new Map<string, string>();
	if (sourceFields.length > 0) {
		const insertedFields = await db
			.insert(formField)
			.values(
				sourceFields.map((f) => ({
					formVersionId: newVersionId,
					projectId,
					key: f.key,
					label: f.label,
					type: f.type,
					helpText: f.helpText,
					required: f.required,
					order: f.order,
					sectionId: f.sectionId
						? (sectionIdMap.get(f.sectionId) ?? null)
						: null,
					halfWidth: f.halfWidth,
					options: f.options,
					allowOther: f.allowOther,
					validation: f.validation,
					isVisible: f.isVisible,
					editableAfterSignup: f.editableAfterSignup,
					isActive: f.isActive,
				})),
			)
			.returning({ id: formField.id, key: formField.key });
		// Map old field ids to new ids by key (keys are unique per version).
		const keyToNewId = new Map(insertedFields.map((f) => [f.key, f.id]));
		for (const f of sourceFields) {
			const nid = keyToNewId.get(f.key);
			if (nid) fieldIdMap.set(f.id, nid);
		}
		// Remap visibility rules to the cloned field ids.
		for (const s of sourceSections) {
			const rule = s.visibilityRule as {
				sourceFieldId?: string;
				operator?:
					| "is_checked"
					| "is_not_checked"
					| "equals"
					| "includes_any"
					| "includes_all";
				values?: string[];
			} | null;
			if (!rule?.sourceFieldId || !rule.operator) continue;
			const newSectionId = sectionIdMap.get(s.id);
			const newSourceId = fieldIdMap.get(rule.sourceFieldId);
			if (!newSectionId) continue;
			if (!newSourceId) {
				await db
					.update(formSection)
					.set({ visibilityRule: null })
					.where(eq(formSection.id, newSectionId));
				continue;
			}
			await db
				.update(formSection)
				.set({
					visibilityRule: {
						sourceFieldId: newSourceId,
						operator: rule.operator,
						...(rule.values ? { values: rule.values } : {}),
					},
				})
				.where(eq(formSection.id, newSectionId));
		}
		// Links do layout do perfil acompanham os novos ids (só no
		// formulário do evento); o resto é descartado sem quebrar nada.
		const clonedVersion = await db.query.formVersion.findFirst({
			where: eq(formVersion.id, newVersionId),
			columns: { activityId: true },
		});
		await remapProfileLinksOnClone(
			projectId,
			!clonedVersion?.activityId,
			fieldIdMap,
		);
	}
	if (sourceSections.length === 0 && sourceFields.length > 0) {
		const fallback = await db
			.insert(formSection)
			.values({
				formVersionId: newVersionId,
				projectId,
				title: "Dados da inscrição",
				order: 0,
			})
			.returning({ id: formSection.id });
		if (fallback[0]) {
			await db
				.update(formField)
				.set({ sectionId: fallback[0].id })
				.where(eq(formField.formVersionId, newVersionId));
		}
	}
}

export const formsRouter = createTRPCRouter({
	getPublishedForm: publicProcedure
		.input(
			z.object({
				projectId: z.uuid().optional(),
				projectUrl: z.string().optional(),
				activityId: z.uuid().optional(),
			}),
		)
		.query(async ({ input }) => {
			const projectId = await resolveProjectId(input);
			const version = await db.query.formVersion.findFirst({
				where: and(
					eq(formVersion.projectId, projectId),
					versionScope(input.activityId),
					eq(formVersion.isPublished, true),
				),
				orderBy: desc(formVersion.version),
			});
			if (!version) return { version: null, fields: [], sections: [] };
			const [fields, sections] = await Promise.all([
				db.query.formField.findMany({
					where: and(
						eq(formField.formVersionId, version.id),
						eq(formField.isActive, true),
					),
					orderBy: asc(formField.order),
				}),
				db.query.formSection.findMany({
					where: eq(formSection.formVersionId, version.id),
					orderBy: asc(formSection.order),
				}),
			]);
			return { version, fields, sections };
		}),

	listVersions: protectedProcedure
		.input(
			z.object({ projectId: z.uuid(), activityId: z.uuid().optional() }),
		)
		.query(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			if (input.activityId) {
				await requireActivityInProject(
					input.activityId,
					input.projectId,
				);
			}
			const versions = await db.query.formVersion.findMany({
				where: and(
					eq(formVersion.projectId, input.projectId),
					versionScope(input.activityId),
				),
				orderBy: desc(formVersion.version),
			});
			const counts = await Promise.all(
				versions.map((v) =>
					db
						.select({ amount: count() })
						.from(formField)
						.where(
							and(
								eq(formField.formVersionId, v.id),
								eq(formField.isActive, true),
							),
						),
				),
			);
			return versions.map((v, i) => ({
				...v,
				fieldsCount: counts[i]?.[0]?.amount ?? 0,
			}));
		}),

	getVersion: protectedProcedure
		.input(z.object({ versionId: z.uuid() }))
		.query(async ({ input, ctx }) => {
			const version = await db.query.formVersion.findFirst({
				where: eq(formVersion.id, input.versionId),
			});
			if (!version)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Versão não encontrada.",
				});
			await requireProjectAccess(version.projectId, ctx.session.user.id);
			const fields = await db.query.formField.findMany({
				where: eq(formField.formVersionId, version.id),
				orderBy: asc(formField.order),
			});
			const sections = await db.query.formSection.findMany({
				where: eq(formSection.formVersionId, version.id),
				orderBy: asc(formSection.order),
			});
			return { version, fields, sections };
		}),

	createVersion: protectedProcedure
		.input(
			z.object({
				projectId: z.uuid(),
				activityId: z.uuid().optional(),
				cloneFromVersionId: z.uuid().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			if (input.activityId) {
				await requireActivityInProject(
					input.activityId,
					input.projectId,
				);
			}
			const existing = await db.query.formVersion.findMany({
				where: eq(formVersion.projectId, input.projectId),
				orderBy: desc(formVersion.version),
			});
			const next = (existing[0]?.version ?? 0) + 1;
			const created = await db
				.insert(formVersion)
				.values({
					projectId: input.projectId,
					activityId: input.activityId ?? null,
					version: next,
					isPublished: false,
					createdBy: ctx.session.user.id,
				})
				.returning();
			const newVersion = created[0];
			if (!newVersion)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Falha ao criar versão.",
				});

			if (input.cloneFromVersionId) {
				await cloneVersionContents(
					newVersion.id,
					input.cloneFromVersionId,
					input.projectId,
				);
			} else {
				await db.insert(formSection).values({
					formVersionId: newVersion.id,
					projectId: input.projectId,
					title: "Dados da inscrição",
					order: 0,
				});
			}
			return newVersion;
		}),

	importFormVersion: protectedProcedure
		.input(
			z.object({
				projectId: z.uuid(),
				activityId: z.uuid().optional(),
				definition: formVersionExportSchema,
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			if (input.activityId) {
				await requireActivityInProject(
					input.activityId,
					input.projectId,
				);
			}
			const def = input.definition;

			const fieldKeys = new Set<string>();
			for (const f of def.fields) {
				if (fieldKeys.has(f.key)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Chaves de campo duplicadas no arquivo: “${f.key}”.`,
					});
				}
				fieldKeys.add(f.key);
			}

			// Validate every section visibility rule against the exported
			// field/section structure before touching the database, so a
			// bad file never leaves a half-imported version behind.
			const sectionOrderSet = new Set(def.sections.map((s) => s.order));
			for (const s of def.sections) {
				const rule = s.visibilityRule;
				if (!rule) continue;
				const source = def.fields.find(
					(f) => f.key === rule.sourceFieldKey,
				);
				if (!source) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Condição da seção “${s.title}” referencia um campo desconhecido.`,
					});
				}
				const sourceSectionOrder = source.sectionOrder ?? null;
				const sourceSectionId =
					sourceSectionOrder !== null &&
					sectionOrderSet.has(sourceSectionOrder)
						? String(sourceSectionOrder)
						: null;
				const err = validateSectionVisibilityRule({
					rule: {
						sourceFieldId: source.key,
						operator: rule.operator,
						...(rule.values ? { values: rule.values } : {}),
					},
					sourceField: {
						id: source.key,
						type: source.type,
						options: source.options ?? null,
					},
					sectionId: String(s.order),
					sourceSectionId,
				});
				if (err) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Condição da seção “${s.title}” inválida: ${err}`,
					});
				}
			}

			const existing = await db.query.formVersion.findMany({
				where: eq(formVersion.projectId, input.projectId),
				orderBy: desc(formVersion.version),
			});
			const next = (existing[0]?.version ?? 0) + 1;
			const created = await db
				.insert(formVersion)
				.values({
					projectId: input.projectId,
					activityId: input.activityId ?? null,
					version: next,
					isPublished: false,
					createdBy: ctx.session.user.id,
				})
				.returning();
			const newVersion = created[0];
			if (!newVersion)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Falha ao criar versão.",
				});

			const sortedSections = [...def.sections].sort(
				(a, b) => a.order - b.order,
			);
			const sectionIdByOrder = new Map<number, string>();
			for (let i = 0; i < sortedSections.length; i++) {
				const s = sortedSections[i]!;
				const inserted = await db
					.insert(formSection)
					.values({
						formVersionId: newVersion.id,
						projectId: input.projectId,
						title: s.title,
						order: i,
						visibilityRule: null,
					})
					.returning({ id: formSection.id });
				if (inserted[0]) sectionIdByOrder.set(s.order, inserted[0].id);
			}
			if (sortedSections.length === 0) {
				await db.insert(formSection).values({
					formVersionId: newVersion.id,
					projectId: input.projectId,
					title: "Dados da inscrição",
					order: 0,
				});
			}

			const sortedFields = [...def.fields].sort(
				(a, b) => a.order - b.order,
			);
			const fieldIdByKey = new Map<string, string>();
			for (let i = 0; i < sortedFields.length; i++) {
				const f = sortedFields[i]!;
				const allowOther =
					(f.type === "select_single" ||
						f.type === "select_multiple" ||
						f.type === "radio_group") &&
					f.allowOther === true;
				const sectionId =
					f.sectionOrder !== null &&
					f.sectionOrder !== undefined &&
					sectionOrderSet.has(f.sectionOrder)
						? (sectionIdByOrder.get(f.sectionOrder) ?? null)
						: null;
				const inserted = await db
					.insert(formField)
					.values({
						formVersionId: newVersion.id,
						projectId: input.projectId,
						key: f.key,
						label: f.label,
						type: f.type,
						helpText: f.helpText ?? null,
						required: f.required,
						order: i,
						sectionId,
						halfWidth: f.halfWidth,
						options: f.options ?? null,
						allowOther,
						validation: f.validation ?? null,
						isVisible: f.isVisible,
						editableAfterSignup: f.editableAfterSignup,
						isActive: f.isActive,
					})
					.returning({ id: formField.id });
				if (inserted[0]) {
					fieldIdByKey.set(f.key, inserted[0].id);
				}
			}

			// Rehydrate section visibility rules with the new field ids.
			for (const s of sortedSections) {
				const rule = s.visibilityRule;
				if (!rule) continue;
				const newSectionId = sectionIdByOrder.get(s.order);
				const newSourceId = fieldIdByKey.get(rule.sourceFieldKey);
				if (!newSectionId || !newSourceId) continue;
				await db
					.update(formSection)
					.set({
						visibilityRule: {
							sourceFieldId: newSourceId,
							operator: rule.operator,
							...(rule.values ? { values: rule.values } : {}),
						},
					})
					.where(eq(formSection.id, newSectionId));
			}

			return newVersion;
		}),

	upsertField: protectedProcedure
		.input(upsertFormFieldInput)
		.mutation(async ({ input, ctx }) => {
			const version = await db.query.formVersion.findFirst({
				where: eq(formVersion.id, input.versionId),
			});
			if (!version)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Versão não encontrada.",
				});
			await requireProjectAccess(version.projectId, ctx.session.user.id);
			if (version.isPublished) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Versão publicada é imutável. Crie uma nova versão para editar.",
				});
			}
			if (
				(input.type === "select_single" ||
					input.type === "select_multiple" ||
					input.type === "radio_group") &&
				(!input.options || input.options.length === 0)
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Campos de seleção exigem ao menos uma opção.",
				});
			}
			// allowOther only applies to select fields; a stale flag must not survive a type change.
			const allowOther =
				(input.type === "select_single" ||
					input.type === "select_multiple" ||
					input.type === "radio_group") &&
				input.allowOther === true;
			if (allowOther && hasOutroOption(input.options)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Remova a opção “Outro” da lista — ela já é adicionada automaticamente.",
				});
			}
			if (input.type === "social_links" && input.options) {
				const unknown = input.options.filter(
					(o) => !socialServiceById(o),
				);
				if (unknown.length > 0) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Serviços inválidos: ${unknown.join(", ")}.`,
					});
				}
			}
			let sectionId: string | null | undefined;
			if (input.sectionId !== undefined) {
				if (input.sectionId === null) {
					sectionId = null;
				} else {
					const section = await db.query.formSection.findFirst({
						where: and(
							eq(formSection.id, input.sectionId),
							eq(formSection.formVersionId, input.versionId),
						),
						columns: { id: true },
					});
					if (!section)
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Seção não encontrada nesta versão.",
						});
					sectionId = section.id;
				}
			}
			if (input.fieldId) {
				// Guard dependent conditional sections against breaking type/option/section changes.
				const dependents = (
					await db.query.formSection.findMany({
						where: eq(formSection.formVersionId, input.versionId),
					})
				).filter(
					(s) =>
						(s.visibilityRule as { sourceFieldId?: string } | null)
							?.sourceFieldId === input.fieldId,
				);
				if (dependents.length > 0) {
					if (!isConditionalTriggerType(input.type)) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Este campo controla ${dependents.length} seção(ões). Altere o tipo apenas para checkbox, seleção ou rádio.`,
						});
					}
					const nextSectionId =
						sectionId !== undefined
							? sectionId
							: ((
									await db.query.formField.findFirst({
										where: eq(formField.id, input.fieldId!),
										columns: { sectionId: true },
									})
								)?.sectionId ?? null);
					for (const dep of dependents) {
						if (nextSectionId && dep.id === nextSectionId) {
							throw new TRPCError({
								code: "BAD_REQUEST",
								message:
									"O campo de origem não pode ficar dentro da seção que ele controla.",
							});
						}
						const rule = dep.visibilityRule as {
							sourceFieldId: string;
							operator:
								| "is_checked"
								| "is_not_checked"
								| "equals"
								| "includes_any"
								| "includes_all";
							values?: string[];
						};
						const err = validateSectionVisibilityRule({
							rule,
							sourceField: {
								id: input.fieldId!,
								type: input.type,
								options: input.options ?? null,
							},
							sectionId: dep.id,
							sourceSectionId: nextSectionId,
						});
						if (err) {
							throw new TRPCError({
								code: "BAD_REQUEST",
								message: `A alteração quebra a condição da seção “${dep.title}”: ${err}`,
							});
						}
					}
				}
				const before = input.fieldId
					? await db.query.formField.findFirst({
							where: and(
								eq(formField.id, input.fieldId),
								eq(formField.formVersionId, input.versionId),
							),
							columns: { type: true, required: true },
						})
					: null;
				const updated = await db
					.update(formField)
					.set({
						label: input.label,
						type: input.type,
						helpText: input.helpText ?? null,
						required: input.required,
						halfWidth: input.halfWidth,
						...(sectionId !== undefined ? { sectionId } : {}),
						options: input.options ?? null,
						allowOther,
						validation: input.validation ?? null,
						isVisible: input.isVisible,
						editableAfterSignup: input.editableAfterSignup,
					})
					.where(
						and(
							eq(formField.id, input.fieldId),
							eq(formField.formVersionId, input.versionId),
						),
					)
					.returning();
				if (!updated[0])
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Campo não encontrado.",
					});
				if (input.fieldId) {
					const layout = await readProjectLayout(version.projectId);
					const slot = slotForField(layout, input.fieldId);
					if (slot && !isCompatible(slot.slot, input.type)) {
						// Tipo incompatível com o slot: link some (sem quebrar nada).
						await removeProfileLinksForFields(version.projectId, [
							input.fieldId,
						]);
					} else if (
						slot &&
						before?.required === true &&
						input.required === false
					) {
						// Virou opcional: flags somem (sem estado morto). Valores
						// preenchidos passam a aparecer (aviso no editor).
						await dropVisibilityForFields([input.fieldId]);
					}
				}
				return updated[0];
			}
			const baseKey = input.key?.trim() || slugifyKey(input.label);
			const key = await resolveUniqueKey(input.versionId, baseKey);
			const orderRows = await db.query.formField.findMany({
				where: eq(formField.formVersionId, input.versionId),
				columns: { order: true },
			});
			const nextOrder =
				orderRows.reduce((max, r) => Math.max(max, r.order), -1) + 1;
			const created = await db
				.insert(formField)
				.values({
					formVersionId: input.versionId,
					projectId: version.projectId,
					key,
					label: input.label,
					type: input.type,
					helpText: input.helpText ?? null,
					required: input.required,
					order: nextOrder,
					sectionId:
						sectionId !== undefined
							? sectionId
							: ((
									await db.query.formSection.findFirst({
										where: eq(
											formSection.formVersionId,
											input.versionId,
										),
										orderBy: asc(formSection.order),
										columns: { id: true },
									})
								)?.id ?? null),
					halfWidth: input.halfWidth,
					options: input.options ?? null,
					allowOther,
					validation: input.validation ?? null,
					isVisible: input.isVisible,
					editableAfterSignup: input.editableAfterSignup,
				})
				.returning();
			return created[0];
		}),

	deleteField: protectedProcedure
		.input(z.object({ fieldId: z.uuid() }))
		.mutation(async ({ input, ctx }) => {
			const field = await db.query.formField.findFirst({
				where: eq(formField.id, input.fieldId),
				with: { version: true },
			});
			if (!field)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Campo não encontrado.",
				});
			await requireProjectAccess(field.projectId, ctx.session.user.id);
			if (field.version.isPublished) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Versão publicada é imutável. Crie uma nova versão para editar.",
				});
			}
			const dependentSections = await db.query.formSection.findMany({
				where: eq(formSection.formVersionId, field.formVersionId),
			});
			const dependents = dependentSections.filter(
				(s) =>
					(s.visibilityRule as { sourceFieldId?: string } | null)
						?.sourceFieldId === input.fieldId,
			);
			if (dependents.length > 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Este campo controla a visibilidade de ${dependents.length} seção(ões). Remova a condição antes de excluí-lo.`,
				});
			}
			const answersCount = await db
				.select({ amount: count() })
				.from(formAnswer)
				.where(eq(formAnswer.fieldId, input.fieldId));
			// Links do perfil p/ este campo somem junto (sem referência
			// pendurada); flags de visibilidade vão junto.
			await removeProfileLinksForFields(field.projectId, [input.fieldId]);
			if ((answersCount[0]?.amount ?? 0) > 0) {
				await db
					.update(formField)
					.set({ isActive: false })
					.where(eq(formField.id, input.fieldId));
				return { softDeleted: true };
			}
			await db.delete(formField).where(eq(formField.id, input.fieldId));
			return { softDeleted: false };
		}),

	reorderFields: protectedProcedure
		.input(reorderFormFieldsInput)
		.mutation(async ({ input, ctx }) => {
			const version = await db.query.formVersion.findFirst({
				where: eq(formVersion.id, input.versionId),
			});
			if (!version)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Versão não encontrada.",
				});
			await requireProjectAccess(version.projectId, ctx.session.user.id);
			if (version.isPublished) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Versão publicada é imutável.",
				});
			}
			if (input.sectionIdByField) {
				for (const sid of Object.values(input.sectionIdByField)) {
					if (sid === null || sid === undefined) continue;
					const section = await db.query.formSection.findFirst({
						where: and(
							eq(formSection.id, sid),
							eq(formSection.formVersionId, input.versionId),
						),
						columns: { id: true },
					});
					if (!section)
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Seção inválida para esta versão.",
						});
				}
				const allSections = await db.query.formSection.findMany({
					where: eq(formSection.formVersionId, input.versionId),
				});
				for (const [fid, sid] of Object.entries(
					input.sectionIdByField,
				)) {
					if (sid === null || sid === undefined) continue;
					const dependent = allSections.find(
						(s) =>
							(
								s.visibilityRule as {
									sourceFieldId?: string;
								} | null
							)?.sourceFieldId === fid && s.id === sid,
					);
					if (dependent) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message:
								"O campo de origem não pode ficar dentro da seção que ele controla.",
						});
					}
				}
			}
			await db.transaction(async (tx) => {
				for (let i = 0; i < input.orderedIds.length; i++) {
					const fid = input.orderedIds[i]!;
					const sid = input.sectionIdByField?.[fid];
					await tx
						.update(formField)
						.set({
							order: i,
							...(sid !== undefined ? { sectionId: sid } : {}),
						})
						.where(
							and(
								eq(formField.id, fid),
								eq(formField.formVersionId, input.versionId),
							),
						);
				}
			});
			return { success: true };
		}),

	upsertSection: protectedProcedure
		.input(upsertFormSectionInput)
		.mutation(async ({ input, ctx }) => {
			const version = await db.query.formVersion.findFirst({
				where: eq(formVersion.id, input.versionId),
			});
			if (!version)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Versão não encontrada.",
				});
			await requireProjectAccess(version.projectId, ctx.session.user.id);
			if (version.isPublished) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Versão publicada é imutável. Crie uma nova versão para editar.",
				});
			}
			const hasRuleKey = "visibilityRule" in input;
			const visibilityRule = input.visibilityRule ?? null;
			if (visibilityRule) {
				const source = await db.query.formField.findFirst({
					where: and(
						eq(formField.id, visibilityRule.sourceFieldId),
						eq(formField.formVersionId, input.versionId),
					),
				});
				if (!source)
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Campo de origem não encontrado nesta versão.",
					});
				const err = validateSectionVisibilityRule({
					rule: visibilityRule,
					sourceField: {
						id: source.id,
						type: source.type,
						options: source.options,
					},
					sectionId: input.sectionId ?? null,
					sourceSectionId: source.sectionId,
				});
				if (err)
					throw new TRPCError({ code: "BAD_REQUEST", message: err });
			}
			if (input.sectionId) {
				const updated = await db
					.update(formSection)
					.set({
						title: input.title,
						...(hasRuleKey ? { visibilityRule } : {}),
					})
					.where(
						and(
							eq(formSection.id, input.sectionId),
							eq(formSection.formVersionId, input.versionId),
						),
					)
					.returning();
				if (!updated[0])
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Seção não encontrada.",
					});
				return updated[0];
			}
			const orderRows = await db.query.formSection.findMany({
				where: eq(formSection.formVersionId, input.versionId),
				columns: { order: true },
			});
			const nextOrder =
				orderRows.reduce((max, r) => Math.max(max, r.order), -1) + 1;
			const created = await db
				.insert(formSection)
				.values({
					formVersionId: input.versionId,
					projectId: version.projectId,
					title: input.title,
					order: nextOrder,
					visibilityRule,
				})
				.returning();
			return created[0];
		}),

	deleteSection: protectedProcedure
		.input(z.object({ sectionId: z.uuid() }))
		.mutation(async ({ input, ctx }) => {
			const section = await db.query.formSection.findFirst({
				where: eq(formSection.id, input.sectionId),
				with: { version: true },
			});
			if (!section)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Seção não encontrada.",
				});
			await requireProjectAccess(section.projectId, ctx.session.user.id);
			if (section.version.isPublished) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Versão publicada é imutável. Crie uma nova versão para editar.",
				});
			}
			const siblings = await db.query.formSection.findMany({
				where: eq(formSection.formVersionId, section.formVersionId),
				columns: { id: true },
			});
			if (siblings.length <= 1) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "O formulário precisa de ao menos uma seção.",
				});
			}
			const fieldsCount = await db
				.select({ amount: count() })
				.from(formField)
				.where(eq(formField.sectionId, input.sectionId));
			if ((fieldsCount[0]?.amount ?? 0) > 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Mova ou exclua os campos desta seção antes de excluí-la.",
				});
			}
			await db
				.delete(formSection)
				.where(eq(formSection.id, input.sectionId));
			return { success: true };
		}),

	reorderSections: protectedProcedure
		.input(reorderFormSectionsInput)
		.mutation(async ({ input, ctx }) => {
			const version = await db.query.formVersion.findFirst({
				where: eq(formVersion.id, input.versionId),
			});
			if (!version)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Versão não encontrada.",
				});
			await requireProjectAccess(version.projectId, ctx.session.user.id);
			if (version.isPublished) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Versão publicada é imutável.",
				});
			}
			await db.transaction(async (tx) => {
				for (let i = 0; i < input.orderedIds.length; i++) {
					await tx
						.update(formSection)
						.set({ order: i })
						.where(
							and(
								eq(formSection.id, input.orderedIds[i]!),
								eq(formSection.formVersionId, input.versionId),
							),
						);
				}
			});
			return { success: true };
		}),

	publishVersion: protectedProcedure
		.input(z.object({ versionId: z.uuid() }))
		.mutation(async ({ input, ctx }) => {
			const version = await db.query.formVersion.findFirst({
				where: eq(formVersion.id, input.versionId),
			});
			if (!version)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Versão não encontrada.",
				});
			await requireProjectAccess(version.projectId, ctx.session.user.id);
			await db.transaction(async (tx) => {
				await tx
					.update(formVersion)
					.set({ isPublished: false })
					.where(
						and(
							eq(formVersion.projectId, version.projectId),
							versionScope(version.activityId),
						),
					);
				await tx
					.update(formVersion)
					.set({ isPublished: true, publishedAt: new Date() })
					.where(eq(formVersion.id, input.versionId));
			});
			return { success: true, activityId: version.activityId };
		}),

	deleteVersion: protectedProcedure
		.input(z.object({ versionId: z.uuid() }))
		.mutation(async ({ input, ctx }) => {
			const version = await db.query.formVersion.findFirst({
				where: eq(formVersion.id, input.versionId),
			});
			if (!version)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Versão não encontrada.",
				});
			await requireProjectAccess(version.projectId, ctx.session.user.id);
			if (version.isPublished) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Versão publicada não pode ser excluída.",
				});
			}
			const answersCount = await db
				.select({ amount: count() })
				.from(formAnswer)
				.where(eq(formAnswer.formVersionId, input.versionId));
			if ((answersCount[0]?.amount ?? 0) > 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Esta versão possui respostas vinculadas e não pode ser excluída.",
				});
			}
			const versionFields = await db.query.formField.findMany({
				where: eq(formField.formVersionId, input.versionId),
				columns: { id: true },
			});
			await removeProfileLinksForFields(
				version.projectId,
				versionFields.map((f) => f.id),
			);
			await db.transaction(async (tx) => {
				await tx
					.delete(formField)
					.where(eq(formField.formVersionId, input.versionId));
				await tx
					.delete(formSection)
					.where(eq(formSection.formVersionId, input.versionId));
				await tx
					.delete(formVersion)
					.where(eq(formVersion.id, input.versionId));
			});
			return { success: true };
		}),

	unpublishVersion: protectedProcedure
		.input(z.object({ versionId: z.uuid() }))
		.mutation(async ({ input, ctx }) => {
			const version = await db.query.formVersion.findFirst({
				where: eq(formVersion.id, input.versionId),
			});
			if (!version)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Versão não encontrada.",
				});
			await requireProjectAccess(version.projectId, ctx.session.user.id);
			await db
				.update(formVersion)
				.set({ isPublished: false })
				.where(eq(formVersion.id, input.versionId));
			return { success: true, activityId: version.activityId };
		}),

	/**
	 * Hybrid editing entry point for activity forms (versioning hidden).
	 * Returns the version the organizer should edit:
	 * - latest version when it is still a draft, or published without answers;
	 * - a fresh clone when the published version already has answers
	 *   (old answers stay linked to the old version).
	 */
	getOrCreateEditableActivityForm: protectedProcedure
		.input(z.object({ activityId: z.uuid() }))
		.mutation(async ({ input, ctx }) => {
			const foundActivity = await db.query.activity.findFirst({
				where: eq(activity.id, input.activityId),
				columns: { id: true, projectId: true },
			});
			if (!foundActivity)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Atividade não encontrada.",
				});
			await requireProjectAccess(
				foundActivity.projectId,
				ctx.session.user.id,
			);

			const latest = await db.query.formVersion.findFirst({
				where: and(
					eq(formVersion.projectId, foundActivity.projectId),
					eq(formVersion.activityId, input.activityId),
				),
				orderBy: desc(formVersion.version),
			});

			const loadFull = async (versionId: string) => {
				const [fields, sections] = await Promise.all([
					db.query.formField.findMany({
						where: eq(formField.formVersionId, versionId),
						orderBy: asc(formField.order),
					}),
					db.query.formSection.findMany({
						where: eq(formSection.formVersionId, versionId),
						orderBy: asc(formSection.order),
					}),
				]);
				return { fields, sections };
			};

			if (!latest) {
				const existing = await db.query.formVersion.findMany({
					where: eq(formVersion.projectId, foundActivity.projectId),
					orderBy: desc(formVersion.version),
				});
				const next = (existing[0]?.version ?? 0) + 1;
				const created = await db
					.insert(formVersion)
					.values({
						projectId: foundActivity.projectId,
						activityId: input.activityId,
						version: next,
						isPublished: false,
						createdBy: ctx.session.user.id,
					})
					.returning();
				const draft = created[0];
				if (!draft)
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Falha ao criar versão.",
					});
				await db.insert(formSection).values({
					formVersionId: draft.id,
					projectId: foundActivity.projectId,
					title: "Dados da inscrição",
					order: 0,
				});
				const full = await loadFull(draft.id);
				return { version: draft, ...full, cloned: false };
			}

			const answersCount = await db
				.select({ amount: count() })
				.from(formAnswer)
				.where(eq(formAnswer.formVersionId, latest.id));
			const hasAnswers = (answersCount[0]?.amount ?? 0) > 0;

			if (latest.isPublished && hasAnswers) {
				const existing = await db.query.formVersion.findMany({
					where: eq(formVersion.projectId, foundActivity.projectId),
					orderBy: desc(formVersion.version),
				});
				const next = (existing[0]?.version ?? 0) + 1;
				const created = await db
					.insert(formVersion)
					.values({
						projectId: foundActivity.projectId,
						activityId: input.activityId,
						version: next,
						isPublished: false,
						createdBy: ctx.session.user.id,
					})
					.returning();
				const draft = created[0];
				if (!draft)
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Falha ao criar versão.",
					});
				await cloneVersionContents(
					draft.id,
					latest.id,
					foundActivity.projectId,
				);
				const full = await loadFull(draft.id);
				return { version: draft, ...full, cloned: true };
			}

			const full = await loadFull(latest.id);
			return { version: latest, ...full, cloned: false };
		}),

	submitAnswers: protectedProcedure
		.input(submitAnswersInput)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id;
			const projectData = await db.query.project.findFirst({
				where: eq(project.id, input.projectId),
			});
			if (!projectData)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Evento não encontrado.",
				});
			if (
				!projectData.isRegistrationEnabled ||
				projectData.isArchived ||
				projectData.endDate < new Date()
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Inscrições encerradas para este evento.",
				});
			}
			const existingParticipant = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, input.projectId),
					eq(participant.userId, userId),
				),
			});
			if (existingParticipant) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Você já está inscrito neste evento.",
				});
			}
			const { version, fields, sections } =
				await getPublishedVersionWithFields(input.projectId);

			const validation = validateAnswers(
				toValidationFields(fields),
				input.answers,
				toVisibilitySections(sections),
			);
			if (!validation.success) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Respostas inválidas. Verifique os campos obrigatórios.",
					cause: validation.errors,
				});
			}

			await db
				.update(user)
				.set({ name: input.name })
				.where(eq(user.id, userId));

			const createdParticipants = await db
				.insert(participant)
				.values({
					userId,
					projectId: input.projectId,
					shortId: generateShortId(),
				})
				.returning({
					id: participant.id,
					shortId: participant.shortId,
				});
			const participantId = createdParticipants[0]?.id;
			const shortId = createdParticipants[0]?.shortId;
			if (!participantId || !shortId)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Falha ao criar inscrição.",
				});

			if (version && fields.length > 0) {
				const rows = buildAnswerRows({
					participantId,
					projectId: input.projectId,
					versionId: version.id,
					fields,
					sections,
					data: (validation.data ?? {}) as Record<string, unknown>,
				});
				if (rows.length > 0) await db.insert(formAnswer).values(rows);
			}
			return { participantId, shortId };
		}),

	getMyAnswers: protectedProcedure
		.input(
			z.object({
				projectId: z.uuid().optional(),
				projectUrl: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const projectId =
				input.projectId ??
				(await resolveProjectId({ projectUrl: input.projectUrl }));
			const participantRow = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, projectId),
					eq(participant.userId, ctx.session.user.id),
				),
			});
			if (!participantRow) return { participant: null, answers: [] };
			const answers = await db.query.formAnswer.findMany({
				where: eq(formAnswer.participantId, participantRow.id),
				with: { field: true },
			});
			return {
				participant: participantRow,
				answers: answers.map((a) => ({
					...a,
					value: answerToValue(a),
				})),
			};
		}),

	updateMyAnswers: protectedProcedure
		.input(
			z.object({
				projectId: z.uuid(),
				answers: z.record(z.string(), answerValueSchema),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const participantRow = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, input.projectId),
					eq(participant.userId, ctx.session.user.id),
				),
			});
			if (!participantRow)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Inscrição não encontrada.",
				});
			const version = await db.query.formVersion.findFirst({
				where: and(
					eq(formVersion.projectId, input.projectId),
					eq(formVersion.isPublished, true),
				),
				orderBy: desc(formVersion.version),
			});
			if (!version)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Formulário não publicado.",
				});
			const fields = await db.query.formField.findMany({
				where: and(
					eq(formField.formVersionId, version.id),
					eq(formField.isActive, true),
				),
				orderBy: asc(formField.order),
			});
			const sections = await db.query.formSection.findMany({
				where: eq(formSection.formVersionId, version.id),
				orderBy: asc(formSection.order),
			});
			const editable = fields.filter(
				(f) => f.editableAfterSignup && f.isVisible,
			);
			const validation = validateAnswers(
				toValidationFields(editable),
				input.answers,
				toVisibilitySections(sections),
			);
			if (!validation.success) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Respostas inválidas.",
					cause: validation.errors,
				});
			}
			const visibleEditable = filterVisibleFields(
				toValidationFields(editable),
				toVisibilitySections(sections),
				(validation.data ?? {}) as Record<string, unknown>,
			);
			const visibleEditableKeys = new Set(
				visibleEditable.map((f) => f.key),
			);
			for (const field of editable) {
				if (!visibleEditableKeys.has(field.key)) {
					await db
						.delete(formAnswer)
						.where(
							and(
								eq(formAnswer.participantId, participantRow.id),
								eq(formAnswer.fieldId, field.id),
							),
						);
					continue;
				}
				const raw = (validation.data ?? {})[field.key];
				if (raw === undefined) {
					if (!field.required) {
						await db
							.delete(formAnswer)
							.where(
								and(
									eq(
										formAnswer.participantId,
										participantRow.id,
									),
									eq(formAnswer.fieldId, field.id),
								),
							);
					}
					continue;
				}
				const mapped = mapValueToColumns(field.type, raw);
				if (!mapped) continue;
				await db
					.insert(formAnswer)
					.values({
						participantId: participantRow.id,
						fieldId: field.id,
						formVersionId: version.id,
						projectId: input.projectId,
						fieldSnapshot: {
							key: field.key,
							label: field.label,
							type: field.type,
							required: field.required,
							options: field.options,
							allowOther: field.allowOther,
						},
						...mapped,
					})
					.onConflictDoUpdate({
						target: [formAnswer.participantId, formAnswer.fieldId],
						set: {
							...mapped,
							updatedAt: new Date(),
							formVersionId: version.id,
						},
					});
			}
			return { success: true };
		}),

	getParticipantAnswers: protectedProcedure
		.input(z.object({ participantId: z.uuid() }))
		.query(async ({ input, ctx }) => {
			const participantRow = await db.query.participant.findFirst({
				where: eq(participant.id, input.participantId),
				with: {
					user: {
						columns: { name: true, email: true, image_url: true },
					},
					project: {
						with: { moderators: { columns: { userId: true } } },
					},
				},
			});
			if (!participantRow)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participante não encontrado.",
				});
			const requester = ctx.session.user.id;
			const isManager =
				participantRow.project.moderators.some(
					(m) => m.userId === requester,
				) || participantRow.project.ownerId === requester;
			if (!isManager && participantRow.userId !== requester) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Sem permissão.",
				});
			}
			const answers = await db.query.formAnswer.findMany({
				where: eq(formAnswer.participantId, input.participantId),
				with: { field: true, version: true },
			});
			return {
				participant: participantRow,
				answers: answers.map((a) => ({
					...a,
					value: answerToValue(a),
				})),
			};
		}),

	listAnswers: protectedProcedure
		.input(
			z.object({
				projectId: z.uuid(),
				page: z.coerce.number().default(1),
				pageSize: z.coerce.number().default(10),
				query: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const version = await db.query.formVersion.findFirst({
				where: and(
					eq(formVersion.projectId, input.projectId),
					eq(formVersion.isPublished, true),
				),
				orderBy: desc(formVersion.version),
			});
			const fields = version
				? await db.query.formField.findMany({
						where: and(
							eq(formField.formVersionId, version.id),
							eq(formField.isActive, true),
						),
						orderBy: asc(formField.order),
					})
				: [];

			const page = Math.max(1, input.page);
			const pageSize = Math.min(50, Math.max(1, input.pageSize));
			const whereClauses = [eq(participant.projectId, input.projectId)];
			if (input.query) {
				whereClauses.push(
					or(
						ilike(user.name, `%${input.query}%`),
						ilike(user.email, `%${input.query}%`),
					)!,
				);
			}
			const [rows, total] = await Promise.all([
				db
					.select({
						id: participant.id,
						joinedAt: participant.joinedAt,
						user: {
							name: user.name,
							email: user.email,
							image_url: user.image_url,
						},
					})
					.from(participant)
					.leftJoin(user, eq(participant.userId, user.id))
					.where(and(...whereClauses))
					.orderBy(desc(participant.joinedAt))
					.limit(pageSize)
					.offset((page - 1) * pageSize),
				db
					.select({ amount: count() })
					.from(participant)
					.leftJoin(user, eq(participant.userId, user.id))
					.where(and(...whereClauses)),
			]);
			const ids = rows.map((r) => r.id);
			const answers = ids.length
				? await db.query.formAnswer.findMany({
						where: inArray(formAnswer.participantId, ids),
					})
				: [];
			const byParticipant = new Map<string, Record<string, unknown>>();
			for (const a of answers) {
				const field = fields.find((f) => f.id === a.fieldId);
				const key = field?.key ?? a.fieldSnapshot?.key ?? a.fieldId;
				if (!byParticipant.has(a.participantId))
					byParticipant.set(a.participantId, {});
				byParticipant.get(a.participantId)![key] = answerToValue(a);
			}
			return {
				version,
				fields,
				participants: rows.map((r) => ({
					...r,
					answers: byParticipant.get(r.id) ?? {},
				})),
				pageCount: Math.ceil((total[0]?.amount ?? 0) / pageSize),
			};
		}),

	exportAnswers: protectedProcedure
		.input(z.object({ projectId: z.uuid() }))
		.query(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const version = await db.query.formVersion.findFirst({
				where: and(
					eq(formVersion.projectId, input.projectId),
					eq(formVersion.isPublished, true),
				),
				orderBy: desc(formVersion.version),
			});
			const fields = version
				? await db.query.formField.findMany({
						where: and(
							eq(formField.formVersionId, version.id),
							eq(formField.isActive, true),
						),
						orderBy: asc(formField.order),
					})
				: [];
			const participants = await db
				.select({
					id: participant.id,
					joinedAt: participant.joinedAt,
					name: user.name,
					email: user.email,
				})
				.from(participant)
				.leftJoin(user, eq(participant.userId, user.id))
				.where(eq(participant.projectId, input.projectId))
				.orderBy(asc(participant.joinedAt))
				.limit(5000);
			const ids = participants.map((p) => p.id);
			const answers = ids.length
				? await db.query.formAnswer.findMany({
						where: inArray(formAnswer.participantId, ids),
					})
				: [];
			const byParticipant = new Map<string, Record<string, unknown>>();
			for (const a of answers) {
				const field = fields.find((f) => f.id === a.fieldId);
				const key = field?.key ?? a.fieldSnapshot?.key ?? a.fieldId;
				if (!byParticipant.has(a.participantId))
					byParticipant.set(a.participantId, {});
				byParticipant.get(a.participantId)![key] = answerToValue(a);
			}
			return {
				version: version
					? { id: version.id, version: version.version }
					: null,
				fields: fields.map((f) => ({
					key: f.key,
					label: f.label,
					type: f.type,
				})),
				rows: participants.map((p) => ({
					...p,
					answers: byParticipant.get(p.id) ?? {},
				})),
			};
		}),
});
