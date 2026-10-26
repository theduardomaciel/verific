import { TRPCError } from "@trpc/server";

import {
	badgeLayoutSchema,
	defaultBadgeItems,
	type BadgeLayout,
} from "@verific/badges";
import { db } from "@verific/drizzle";
import {
	and,
	asc,
	count,
	desc,
	eq,
	inArray,
	isNull,
} from "@verific/drizzle/orm";
import {
	badgeLayout,
	formAnswer,
	formField,
	formVersion,
	participant,
	participantOnActivity,
	speaker,
	speakerOnActivity,
	user,
} from "@verific/drizzle/schema";
import { appUrl } from "@verific/env";
import { z } from "@verific/zod";

import { matchBadgeAnswers } from "../lib/badge-answers";
import { requireProjectAccess } from "../lib/project-access";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ensureShortId } from "./profiles";

/** Tipos de campo do formulário que podem virar linha secundária. */
export const BADGE_COMPATIBLE_FIELD_TYPES = ["text", "select_single"] as const;

async function readStoredLayout(
	projectId: string,
): Promise<BadgeLayout | null> {
	const row = await db.query.badgeLayout.findFirst({
		where: eq(badgeLayout.projectId, projectId),
		columns: { layout: true },
	});
	if (!row) return null;
	const parsed = badgeLayoutSchema.safeParse(row.layout);
	return parsed.success ? parsed.data : null;
}

/** Campos ligados pelos itens de texto (id do campo, sem o nome). */
function boundFieldIds(layout: BadgeLayout): string[] {
	const ids = new Set<string>();
	for (const item of layout.items) {
		if (
			item.kind === "text" &&
			item.enabled &&
			item.source &&
			item.source !== "name"
		) {
			ids.add(item.source);
		}
	}
	return [...ids];
}

const badgeBatchInputSchema = z.object({
	projectId: z.string().uuid(),
	activityId: z.string().uuid().optional(),
	cursor: z.number().int().min(0).default(0),
	limit: z.number().int().min(1).max(200).default(100),
	fieldIds: z.array(z.string().uuid()).optional(),
	sort: z
		.enum(["name_asc", "name_desc", "joined_asc", "joined_desc"])
		.optional(),
	source: z.enum(["participants", "speakers"]).optional(),
	kind: z.enum(["participants", "speakers"]).optional(),
	entity: z.enum(["participants", "speakers"]).optional(),
	target: z.enum(["participants", "speakers"]).optional(),
	audience: z.enum(["participants", "speakers"]).optional(),
	type: z.enum(["participants", "speakers"]).optional(),
	mode: z.enum(["participants", "speakers"]).optional(),
	scope: z.enum(["participants", "speakers"]).optional(),
	speakers: z.boolean().optional(),
	includeSpeakers: z.boolean().optional(),
	onlySpeakers: z.boolean().optional(),
});

export const badgesRouter = createTRPCRouter({
	/** Layout salvo + flags que o editor precisa (perfis, url). */
	getLayout: protectedProcedure
		.input(z.object({ projectId: z.string().uuid() }))
		.query(async ({ input, ctx }) => {
			const event = await requireProjectAccess(
				input.projectId,
				ctx.session.user.id,
			);
			return {
				layout: await readStoredLayout(input.projectId),
				profilesEnabled: event.profilesEnabled,
				eventUrl: event.url,
			};
		}),

	/** Salva o layout (valida schema + campos ligados). */
	saveLayout: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				layout: badgeLayoutSchema,
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const layout = input.layout;
			const ids = boundFieldIds(layout);
			if (ids.length > 0) {
				const rows = await db.query.formField.findMany({
					where: and(
						eq(formField.projectId, input.projectId),
						inArray(formField.id, ids),
					),
					columns: {
						id: true,
						label: true,
						type: true,
						isActive: true,
					},
				});
				const byId = new Map(rows.map((r) => [r.id, r]));
				for (const item of layout.items) {
					if (
						item.kind !== "text" ||
						!item.source ||
						item.source === "name"
					) {
						continue;
					}
					const field = byId.get(item.source);
					if (
						!field ||
						!field.isActive ||
						!(
							BADGE_COMPATIBLE_FIELD_TYPES as readonly string[]
						).includes(field.type)
					) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Linha "${item.label || "secundária"}" ligada a campo inexistente, inativo ou incompatível.`,
						});
					}
				}
			}
			await db
				.insert(badgeLayout)
				.values({ projectId: input.projectId, layout })
				.onConflictDoUpdate({
					target: [badgeLayout.projectId],
					set: { layout, updatedAt: new Date() },
				});
			return { saved: true };
		}),

	/** Campos elegíveis p/ linhas secundárias (última versão do evento). */
	getBadgeFieldOptions: protectedProcedure
		.input(z.object({ projectId: z.string().uuid() }))
		.query(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const versions = await db.query.formVersion.findMany({
				where: and(
					eq(formVersion.projectId, input.projectId),
					isNull(formVersion.activityId),
				),
				orderBy: desc(formVersion.version),
				columns: { id: true, version: true },
			});
			const version = versions[0];
			if (!version) return { version: null, fields: [] };
			const fields = await db.query.formField.findMany({
				where: and(
					eq(formField.formVersionId, version.id),
					eq(formField.isActive, true),
					inArray(
						formField.type,
						BADGE_COMPATIBLE_FIELD_TYPES as unknown as Array<
							(typeof formField.type.enumValues)[number]
						>,
					),
				),
				columns: { id: true, key: true, label: true, type: true },
				orderBy: asc(formField.order),
			});
			return {
				version: { id: version.id, version: version.version },
				fields,
			};
		}),

	/**
	 * Página de participantes p/ impressão em lote (o worker busca em
	 * páginas). Retorna só os campos ligados no layout + URL do perfil.
	 */
	getBadgeBatch: protectedProcedure
		.input(badgeBatchInputSchema)
		.query(async ({ input, ctx }) => getBadgeBatchImpl(input, ctx)),
	getSpeakerBadgeBatch: protectedProcedure
		.input(badgeBatchInputSchema)
		.query(async ({ input, ctx }) =>
			getBadgeBatchImpl({ ...input, speakers: true }, ctx),
		),
	getSpeakerBadges: protectedProcedure
		.input(badgeBatchInputSchema)
		.query(async ({ input, ctx }) =>
			getBadgeBatchImpl({ ...input, speakers: true }, ctx),
		),
	getBadgesForSpeakers: protectedProcedure
		.input(badgeBatchInputSchema)
		.query(async ({ input, ctx }) =>
			getBadgeBatchImpl({ ...input, speakers: true }, ctx),
		),
});

export async function getBadgeBatchImpl(input: any, ctx: any) {
	const event = await requireProjectAccess(
		input.projectId,
		ctx.session.user.id,
	);
	const layout =
		(await readStoredLayout(input.projectId)) ??
		badgeLayoutSchema.parse({ items: defaultBadgeItems() });
	const wantsSpeakers =
		input.source === "speakers" ||
		input.kind === "speakers" ||
		input.entity === "speakers" ||
		input.target === "speakers" ||
		input.audience === "speakers" ||
		input.type === "speakers" ||
		input.mode === "speakers" ||
		input.scope === "speakers" ||
		input.speakers === true ||
		input.includeSpeakers === true ||
		input.onlySpeakers === true;
	// Use provided fieldIds (from draft) or fall back to saved layout
	const ids = wantsSpeakers ? [] : (input.fieldIds ?? boundFieldIds(layout));
	const fields =
		ids.length > 0
			? await db.query.formField.findMany({
					where: and(
						eq(formField.projectId, input.projectId),
						inArray(formField.id, ids),
					),
					columns: { id: true, key: true, type: true },
				})
			: [];
	// Falha alto em vez de imprimir crachás com linhas caladas: o
	// vínculo pode ter apodrecido (campo editado/removido depois).
	const boundById = new Map(
		fields.map((f) => [f.id, { key: f.key, type: f.type }] as const),
	);
	if (!wantsSpeakers) {
		for (const item of layout.items) {
			if (
				item.kind !== "text" ||
				!item.enabled ||
				!item.source ||
				item.source === "name" ||
				item.source === "label"
			) {
				continue;
			}
			if (!boundById.has(item.source)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Linha "${item.label || "secundária"}" ligada a campo inexistente — vincule novamente no editor e salve.`,
				});
			}
		}
	}

	if (wantsSpeakers) {
		// Fetch speakers for this project (optionally filtered by activity).
		let speakerRows;
		if (input.activityId) {
			const linked = await db
				.select({ speakerId: speakerOnActivity.speakerId })
				.from(speakerOnActivity)
				.where(eq(speakerOnActivity.activityId, input.activityId));
			const ids = linked.map((r) => r.speakerId);
			speakerRows =
				ids.length > 0
					? await db.query.speaker.findMany({
							where: and(
								eq(speaker.projectId, input.projectId),
								inArray(speaker.id, ids),
							),
							with: {
								linkedParticipant: {
									columns: { shortId: true },
								},
							},
						})
					: [];
		} else {
			speakerRows = await db.query.speaker.findMany({
				where: eq(speaker.projectId, input.projectId),
				with: {
					linkedParticipant: {
						columns: { shortId: true },
					},
				},
			});
		}

		// Sort by name (speakers have no join date).
		const sorted = [...speakerRows].sort((a, b) => {
			const cmp = a.name.localeCompare(b.name, "pt-BR");
			return input.sort === "name_desc" ? -cmp : cmp;
		});

		const total = sorted.length;
		const page = sorted.slice(input.cursor, input.cursor + input.limit);

		const ensured = await Promise.all(
			page.map(async (sp) => ({
				...sp,
				shortId: sp.participantId
					? await ensureShortId(
							sp.participantId,
							sp.linkedParticipant?.shortId ??
								(sp as any).shortId ??
								null,
						)
					: (sp.linkedParticipant?.shortId ??
						(sp as any).shortId ??
						null),
			})),
		);

		const base = appUrl;
		const rows = ensured.map((sp) => {
			const shortId = sp.shortId;
			const label = (sp.title ?? "").trim() || "Palestrante";
			const profileUrl = shortId
				? `${base}/${event.url}/profile/${shortId}`
				: `${base}/${event.url}`;
			return {
				participantId: sp.participantId ?? null,
				shortId,
				speakerId: sp.id,
				name: sp.name,
				label,
				profileUrl,
				fields: { label },
			};
		});

		const nextCursor =
			input.cursor + page.length < total
				? input.cursor + page.length
				: null;
		return { rows, nextCursor, total };
	}

	const baseWhere = input.activityId
		? and(
				eq(participant.projectId, input.projectId),
				inArray(
					participant.id,
					db
						.select({
							id: participantOnActivity.participantId,
						})
						.from(participantOnActivity)
						.where(
							eq(
								participantOnActivity.activityId,
								input.activityId,
							),
						),
				),
			)
		: eq(participant.projectId, input.projectId);

	let orderByClause;
	switch (input.sort) {
		case "name_asc":
			orderByClause = asc(user.name);
			break;
		case "name_desc":
			orderByClause = desc(user.name);
			break;
		case "joined_asc":
			orderByClause = asc(participant.joinedAt);
			break;
		case "joined_desc":
			orderByClause = desc(participant.joinedAt);
			break;
		default:
			orderByClause = asc(participant.joinedAt);
	}

	const [totalRows, page] = await Promise.all([
		db.select({ n: count() }).from(participant).where(baseWhere),
		db
			.select({
				id: participant.id,
				shortId: participant.shortId,
				joinedAt: participant.joinedAt,
				user: { name: user.name },
			})
			.from(participant)
			.innerJoin(user, eq(participant.userId, user.id))
			.where(baseWhere)
			.orderBy(orderByClause, asc(participant.id))
			.limit(input.limit)
			.offset(input.cursor),
	]);
	const total = totalRows[0]?.n ?? 0;

	// shortId alimenta o QR (preenche legados na leitura).
	const ensured = await Promise.all(
		page.map(async (p) => ({
			...p,
			shortId: await ensureShortId(p.id, p.shortId),
		})),
	);

	const fieldsByParticipant = new Map<string, Record<string, string>>();
	if (ensured.length > 0 && boundById.size > 0) {
		const answers = await db.query.formAnswer.findMany({
			where: inArray(
				formAnswer.participantId,
				ensured.map((p) => p.id),
			),
			columns: {
				participantId: true,
				fieldId: true,
				valueText: true,
				valueNumber: true,
				valueDate: true,
				valueJson: true,
				fieldSnapshot: true,
				updatedAt: true,
			},
			with: { field: { columns: { key: true } } },
		});
		const matched = matchBadgeAnswers({ answers, boundById });
		for (const [pid, entry] of matched) {
			fieldsByParticipant.set(pid, entry);
		}
	}

	// Campos por id de campo (o display list resolve por source).
	const keyById = new Map(fields.map((f) => [f.id, f.key]));
	const base = appUrl;
	const rows = ensured.map((p) => {
		const byKey = fieldsByParticipant.get(p.id) ?? {};
		const byFieldId: Record<string, string> = {};
		for (const [id, key] of keyById) {
			const value = byKey[key];
			if (value) byFieldId[id] = value;
		}
		return {
			participantId: p.id,
			shortId: p.shortId,
			name: p.user.name,
			label: "",
			profileUrl: `${base}/${event.url}/profile/${p.shortId}`,
			fields: byFieldId,
		};
	});

	const nextCursor =
		input.cursor + page.length < total ? input.cursor + page.length : null;
	return { rows, nextCursor, total };
}
