import { z } from "@verific/zod";

import { db } from "@verific/drizzle";
import {
	formAnswer,
	formField,
	formVersion,
	participant,
	project,
	projectModerator,
	user,
} from "@verific/drizzle/schema";
import { and, asc, count, desc, eq, ilike, inArray, or } from "@verific/drizzle/orm";

import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
	submitAnswersInput,
	upsertFormFieldInput,
	validateAnswers,
	type FormFieldForValidation,
} from "../schemas";

async function requireProjectAccess(projectId: string, userId: string) {
	const data = await db.query.project.findFirst({
		where: eq(project.id, projectId),
		with: {
			moderators: { columns: { userId: true } },
		},
	});
	if (!data) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
	}
	const isOwner = data.ownerId === userId;
	const isModerator = data.moderators.some((m) => m.userId === userId);
	if (!isOwner && !isModerator) {
		throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão neste evento." });
	}
	return data;
}

async function resolveProjectId(input: { projectId?: string; projectUrl?: string }) {
	if (input.projectId) return input.projectId;
	if (input.projectUrl) {
		const found = await db.query.project.findFirst({
			where: eq(project.url, input.projectUrl),
			columns: { id: true },
		});
		if (!found) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
		}
		return found.id;
	}
	throw new TRPCError({ code: "BAD_REQUEST", message: "projectId ou projectUrl é obrigatório." });
}

function toValidationFields(
	fields: typeof formField.$inferSelect[],
): FormFieldForValidation[] {
	return fields.map((f) => ({
		key: f.key,
		label: f.label,
		type: f.type,
		required: f.required,
		options: f.options,
		validation: f.validation,
		isVisible: f.isVisible,
		isActive: f.isActive,
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
			const b = value === true || value === "true" || value === 1 || value === "1";
			return { valueJson: b };
		}
		default:
			return { valueText: String(value) };
	}
}

function answerToValue(row: typeof formAnswer.$inferSelect): unknown {
	if (row.valueJson !== null && row.valueJson !== undefined) return row.valueJson;
	if (row.valueNumber !== null && row.valueNumber !== undefined) return row.valueNumber;
	if (row.valueDate !== null && row.valueDate !== undefined) return row.valueDate;
	return row.valueText;
}

export const formsRouter = createTRPCRouter({
	getPublishedForm: publicProcedure
		.input(
			z.object({
				projectId: z.uuid().optional(),
				projectUrl: z.string().optional(),
			}),
		)
		.query(async ({ input }) => {
			const projectId = await resolveProjectId(input);
			const version = await db.query.formVersion.findFirst({
				where: and(eq(formVersion.projectId, projectId), eq(formVersion.isPublished, true)),
				orderBy: desc(formVersion.version),
			});
			if (!version) return { version: null, fields: [] };
			const fields = await db.query.formField.findMany({
				where: and(eq(formField.formVersionId, version.id), eq(formField.isActive, true)),
				orderBy: asc(formField.order),
			});
			return { version, fields };
		}),

	listVersions: protectedProcedure
		.input(z.object({ projectId: z.uuid() }))
		.query(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const versions = await db.query.formVersion.findMany({
				where: eq(formVersion.projectId, input.projectId),
				orderBy: desc(formVersion.version),
			});
			const counts = await Promise.all(
				versions.map((v) =>
					db
						.select({ amount: count() })
						.from(formField)
						.where(and(eq(formField.formVersionId, v.id), eq(formField.isActive, true))),
				),
			);
			return versions.map((v, i) => ({ ...v, fieldsCount: counts[i]?.[0]?.amount ?? 0 }));
		}),

	getVersion: protectedProcedure
		.input(z.object({ versionId: z.uuid() }))
		.query(async ({ input, ctx }) => {
			const version = await db.query.formVersion.findFirst({
				where: eq(formVersion.id, input.versionId),
			});
			if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Versão não encontrada." });
			await requireProjectAccess(version.projectId, ctx.session.user.id);
			const fields = await db.query.formField.findMany({
				where: eq(formField.formVersionId, version.id),
				orderBy: asc(formField.order),
			});
			return { version, fields };
		}),

	createVersion: protectedProcedure
		.input(
			z.object({
				projectId: z.uuid(),
				cloneFromVersionId: z.uuid().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const existing = await db.query.formVersion.findMany({
				where: eq(formVersion.projectId, input.projectId),
				orderBy: desc(formVersion.version),
			});
			const next = (existing[0]?.version ?? 0) + 1;
			const created = await db
				.insert(formVersion)
				.values({
					projectId: input.projectId,
					version: next,
					isPublished: false,
					createdBy: ctx.session.user.id,
				})
				.returning();
			const newVersion = created[0];
			if (!newVersion) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao criar versão." });

			if (input.cloneFromVersionId) {
				const sourceFields = await db.query.formField.findMany({
					where: eq(formField.formVersionId, input.cloneFromVersionId),
				});
				if (sourceFields.length > 0) {
					await db.insert(formField).values(
						sourceFields.map((f) => ({
							formVersionId: newVersion.id,
							projectId: input.projectId,
							key: f.key,
							label: f.label,
							type: f.type,
							helpText: f.helpText,
							required: f.required,
							order: f.order,
							options: f.options,
							validation: f.validation,
							isVisible: f.isVisible,
							editableAfterSignup: f.editableAfterSignup,
							isActive: f.isActive,
						})),
					);
				}
			}
			return newVersion;
		}),

	upsertField: protectedProcedure
		.input(upsertFormFieldInput)
		.mutation(async ({ input, ctx }) => {
			const version = await db.query.formVersion.findFirst({
				where: eq(formVersion.id, input.versionId),
			});
			if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Versão não encontrada." });
			await requireProjectAccess(version.projectId, ctx.session.user.id);
			if (version.isPublished) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Versão publicada é imutável. Crie uma nova versão para editar.",
				});
			}
			if ((input.type === "select_single" || input.type === "select_multiple") && (!input.options || input.options.length === 0)) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Campos de seleção exigem ao menos uma opção." });
			}
			if (input.fieldId) {
				const updated = await db
					.update(formField)
					.set({
						key: input.key,
						label: input.label,
						type: input.type,
						helpText: input.helpText ?? null,
						required: input.required,
						order: input.order,
						options: input.options ?? null,
						validation: input.validation ?? null,
						isVisible: input.isVisible,
						editableAfterSignup: input.editableAfterSignup,
					})
					.where(and(eq(formField.id, input.fieldId), eq(formField.formVersionId, input.versionId)))
					.returning();
				if (!updated[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Campo não encontrado." });
				return updated[0];
			}
			const duplicate = await db.query.formField.findFirst({
				where: and(eq(formField.formVersionId, input.versionId), eq(formField.key, input.key)),
			});
			if (duplicate) {
				throw new TRPCError({ code: "CONFLICT", message: "Já existe um campo com essa chave nesta versão." });
			}
			const created = await db
				.insert(formField)
				.values({
					formVersionId: input.versionId,
					projectId: version.projectId,
					key: input.key,
					label: input.label,
					type: input.type,
					helpText: input.helpText ?? null,
					required: input.required,
					order: input.order,
					options: input.options ?? null,
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
			if (!field) throw new TRPCError({ code: "NOT_FOUND", message: "Campo não encontrado." });
			await requireProjectAccess(field.projectId, ctx.session.user.id);
			if (field.version.isPublished) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Versão publicada é imutável. Crie uma nova versão para editar.",
				});
			}
			const answersCount = await db
				.select({ amount: count() })
				.from(formAnswer)
				.where(eq(formAnswer.fieldId, input.fieldId));
			if ((answersCount[0]?.amount ?? 0) > 0) {
				await db.update(formField).set({ isActive: false }).where(eq(formField.id, input.fieldId));
				return { softDeleted: true };
			}
			await db.delete(formField).where(eq(formField.id, input.fieldId));
			return { softDeleted: false };
		}),

	reorderFields: protectedProcedure
		.input(z.object({ versionId: z.uuid(), orderedIds: z.array(z.uuid()) }))
		.mutation(async ({ input, ctx }) => {
			const version = await db.query.formVersion.findFirst({
				where: eq(formVersion.id, input.versionId),
			});
			if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Versão não encontrada." });
			await requireProjectAccess(version.projectId, ctx.session.user.id);
			if (version.isPublished) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Versão publicada é imutável." });
			}
			await db.transaction(async (tx) => {
				for (let i = 0; i < input.orderedIds.length; i++) {
					await tx
						.update(formField)
						.set({ order: i })
						.where(and(eq(formField.id, input.orderedIds[i]!), eq(formField.formVersionId, input.versionId)));
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
			if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Versão não encontrada." });
			await requireProjectAccess(version.projectId, ctx.session.user.id);
			await db.transaction(async (tx) => {
				await tx
					.update(formVersion)
					.set({ isPublished: false })
					.where(eq(formVersion.projectId, version.projectId));
				await tx
					.update(formVersion)
					.set({ isPublished: true, publishedAt: new Date() })
					.where(eq(formVersion.id, input.versionId));
			});
			return { success: true };
		}),

	submitAnswers: protectedProcedure
		.input(submitAnswersInput)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id;
			const projectData = await db.query.project.findFirst({
				where: eq(project.id, input.projectId),
			});
			if (!projectData) throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
			if (!projectData.isRegistrationEnabled || projectData.isArchived || projectData.endDate < new Date()) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Inscrições encerradas para este evento." });
			}
			const existingParticipant = await db.query.participant.findFirst({
				where: and(eq(participant.projectId, input.projectId), eq(participant.userId, userId)),
			});
			if (existingParticipant) {
				throw new TRPCError({ code: "CONFLICT", message: "Você já está inscrito neste evento." });
			}
			const version = await db.query.formVersion.findFirst({
				where: and(eq(formVersion.projectId, input.projectId), eq(formVersion.isPublished, true)),
				orderBy: desc(formVersion.version),
			});
			const fields = version
				? await db.query.formField.findMany({
						where: and(eq(formField.formVersionId, version.id), eq(formField.isActive, true)),
						orderBy: asc(formField.order),
					})
				: [];

			const validation = validateAnswers(toValidationFields(fields), input.answers);
			if (!validation.success) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Respostas inválidas. Verifique os campos obrigatórios.",
					cause: validation.errors,
				});
			}

			await db.update(user).set({ name: input.name }).where(eq(user.id, userId));

			const createdParticipants = await db
				.insert(participant)
				.values({ userId, projectId: input.projectId })
				.returning({ id: participant.id });
			const participantId = createdParticipants[0]?.id;
			if (!participantId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao criar inscrição." });

			if (version && fields.length > 0) {
				const rows = [];
				for (const field of fields) {
					if (!field.isVisible) continue;
					const raw = (validation.data ?? {})[field.key];
					if (raw === undefined) continue;
					const mapped = mapValueToColumns(field.type, raw);
					if (!mapped) continue;
					rows.push({
						participantId,
						fieldId: field.id,
						formVersionId: version.id,
						projectId: input.projectId,
						fieldSnapshot: {
							key: field.key,
							label: field.label,
							type: field.type,
							required: field.required,
							options: field.options,
						},
						...mapped,
					});
				}
				if (rows.length > 0) await db.insert(formAnswer).values(rows);
			}
			return { participantId };
		}),

	getMyAnswers: protectedProcedure
		.input(z.object({ projectId: z.uuid().optional(), projectUrl: z.string().optional() }))
		.query(async ({ input, ctx }) => {
			const projectId = input.projectId ?? (await resolveProjectId({ projectUrl: input.projectUrl }));
			const participantRow = await db.query.participant.findFirst({
				where: and(eq(participant.projectId, projectId), eq(participant.userId, ctx.session.user.id)),
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
				answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const participantRow = await db.query.participant.findFirst({
				where: and(eq(participant.projectId, input.projectId), eq(participant.userId, ctx.session.user.id)),
			});
			if (!participantRow) throw new TRPCError({ code: "NOT_FOUND", message: "Inscrição não encontrada." });
			const version = await db.query.formVersion.findFirst({
				where: and(eq(formVersion.projectId, input.projectId), eq(formVersion.isPublished, true)),
				orderBy: desc(formVersion.version),
			});
			if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Formulário não publicado." });
			const fields = await db.query.formField.findMany({
				where: and(eq(formField.formVersionId, version.id), eq(formField.isActive, true)),
				orderBy: asc(formField.order),
			});
			const editable = fields.filter((f) => f.editableAfterSignup && f.isVisible);
			const validation = validateAnswers(toValidationFields(editable), input.answers);
			if (!validation.success) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Respostas inválidas.", cause: validation.errors });
			}
			for (const field of editable) {
				const raw = (validation.data ?? {})[field.key];
				if (raw === undefined) {
					if (!field.required) {
						await db
							.delete(formAnswer)
							.where(and(eq(formAnswer.participantId, participantRow.id), eq(formAnswer.fieldId, field.id)));
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
						},
						...mapped,
					})
					.onConflictDoUpdate({
						target: [formAnswer.participantId, formAnswer.fieldId],
						set: { ...mapped, updatedAt: new Date(), formVersionId: version.id },
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
					user: { columns: { name: true, email: true, image_url: true } },
					project: { with: { moderators: { columns: { userId: true } } } },
				},
			});
			if (!participantRow) throw new TRPCError({ code: "NOT_FOUND", message: "Participante não encontrado." });
			const requester = ctx.session.user.id;
			const isManager =
				participantRow.project.moderators.some((m) => m.userId === requester) ||
				participantRow.project.ownerId === requester;
			if (!isManager && participantRow.userId !== requester) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão." });
			}
			const answers = await db.query.formAnswer.findMany({
				where: eq(formAnswer.participantId, input.participantId),
				with: { field: true, version: true },
			});
			return {
				participant: participantRow,
				answers: answers.map((a) => ({ ...a, value: answerToValue(a) })),
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
				where: and(eq(formVersion.projectId, input.projectId), eq(formVersion.isPublished, true)),
				orderBy: desc(formVersion.version),
			});
			const fields = version
				? await db.query.formField.findMany({
						where: and(eq(formField.formVersionId, version.id), eq(formField.isActive, true)),
						orderBy: asc(formField.order),
					})
				: [];

			const page = Math.max(1, input.page);
			const pageSize = Math.min(50, Math.max(1, input.pageSize));
			const whereClauses = [eq(participant.projectId, input.projectId)];
			if (input.query) {
				whereClauses.push(
					or(ilike(user.name, `%${input.query}%`), ilike(user.email, `%${input.query}%`))!,
				);
			}
			const [rows, total] = await Promise.all([
				db
					.select({
						id: participant.id,
						joinedAt: participant.joinedAt,
						user: { name: user.name, email: user.email, image_url: user.image_url },
					})
					.from(participant)
					.leftJoin(user, eq(participant.userId, user.id))
					.where(and(...whereClauses))
					.orderBy(desc(participant.joinedAt))
					.limit(pageSize)
					.offset((page - 1) * pageSize),
				db.select({ amount: count() }).from(participant).leftJoin(user, eq(participant.userId, user.id)).where(and(...whereClauses)),
			]);
			const ids = rows.map((r) => r.id);
			const answers = ids.length
				? await db.query.formAnswer.findMany({ where: inArray(formAnswer.participantId, ids) })
				: [];
			const byParticipant = new Map<string, Record<string, unknown>>();
			for (const a of answers) {
				const field = fields.find((f) => f.id === a.fieldId);
				const key = field?.key ?? a.fieldSnapshot?.key ?? a.fieldId;
				if (!byParticipant.has(a.participantId)) byParticipant.set(a.participantId, {});
				byParticipant.get(a.participantId)![key] = answerToValue(a);
			}
			return {
				version,
				fields,
				participants: rows.map((r) => ({ ...r, answers: byParticipant.get(r.id) ?? {} })),
				pageCount: Math.ceil((total[0]?.amount ?? 0) / pageSize),
			};
		}),

	exportAnswers: protectedProcedure
		.input(z.object({ projectId: z.uuid() }))
		.query(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const version = await db.query.formVersion.findFirst({
				where: and(eq(formVersion.projectId, input.projectId), eq(formVersion.isPublished, true)),
				orderBy: desc(formVersion.version),
			});
			const fields = version
				? await db.query.formField.findMany({
						where: and(eq(formField.formVersionId, version.id), eq(formField.isActive, true)),
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
				? await db.query.formAnswer.findMany({ where: inArray(formAnswer.participantId, ids) })
				: [];
			const byParticipant = new Map<string, Record<string, unknown>>();
			for (const a of answers) {
				const field = fields.find((f) => f.id === a.fieldId);
				const key = field?.key ?? a.fieldSnapshot?.key ?? a.fieldId;
				if (!byParticipant.has(a.participantId)) byParticipant.set(a.participantId, {});
				byParticipant.get(a.participantId)![key] = answerToValue(a);
			}
			return {
				version: version ? { id: version.id, version: version.version } : null,
				fields: fields.map((f) => ({ key: f.key, label: f.label, type: f.type })),
				rows: participants.map((p) => ({ ...p, answers: byParticipant.get(p.id) ?? {} })),
			};
		}),
});
