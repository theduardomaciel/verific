import { randomBytes } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { z } from "@verific/zod";

import { db } from "@verific/drizzle";
import {
	formAnswer,
	formField,
	participant,
	profileFieldVisibility,
	project,
} from "@verific/drizzle/schema";
import {
	formatProfileValue,
	normalizeSocialLink,
	parseProfileLayout,
	socialDisplayHandle,
	socialServiceById,
	type ProfileLayout,
	type ProfileSlotKey,
	type StatIconKey,
} from "@verific/drizzle/profile-layout";
import { and, eq, inArray } from "@verific/drizzle/orm";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
	isCompatible,
	readProjectLayout,
	slotForField,
} from "../lib/profile-links";

/** Identificador curto por participante/evento (URL + QR). */
export function generateShortId(length = 10): string {
	return randomBytes(length).toString("base64url").slice(0, length);
}

/** Preenche shortId ausente (participantes criados antes da Fase 4). */
export async function ensureShortId(
	participantId: string,
	current: string | null,
): Promise<string> {
	if (current) return current;
	let lastError: unknown = null;
	for (let i = 0; i < 5; i++) {
		const shortId = generateShortId();
		try {
			await db
				.update(participant)
				.set({ shortId })
				.where(eq(participant.id, participantId));
			return shortId;
		} catch (e) {
			lastError = e;
			const msg = e instanceof Error ? e.message : String(e);
			if (!/unique|duplicate/i.test(msg)) throw e;
		}
	}
	throw (
		(lastError instanceof Error && lastError) ||
		new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Falha ao gerar identificador do perfil.",
		})
	);
}

async function resolveProjectId(projectUrl: string) {
	const found = await db.query.project.findFirst({
		where: eq(project.url, projectUrl),
		columns: { id: true },
	});
	if (!found) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
	}
	return found.id;
}

export interface ResolvedStatItem {
	label: string;
	icon: StatIconKey;
	value: string;
	hidden: boolean;
}

export interface ResolvedSocialItem {
	service: string;
	label: string;
	url: string;
	display: string;
	hidden: boolean;
}

export interface ResolvedProfileSlots {
	subtitle: { value: string; hidden: boolean } | null;
	bio: { value: string; hidden: boolean } | null;
	stats: ResolvedStatItem[];
	socials: ResolvedSocialItem[];
	email: { value: string; hidden: boolean } | null;
}

interface LinkFieldRow {
	id: string;
	key: string;
	type: string;
	required: boolean;
	isActive: boolean;
}

function isEmptyAnswer(value: unknown): boolean {
	return (
		value === undefined ||
		value === null ||
		value === "" ||
		(Array.isArray(value) && value.length === 0)
	);
}

/**
 * Resolve os slots do layout a partir das respostas (indexadas por chave,
 * sobrevivendo a clones de versão) + flags de visibilidade. Links
 * pendurados (campo sumiu/trocou de tipo/inativo) são pulados: nunca
 * quebra a página. `owner:true` inclui itens ocultos marcados.
 */
export function resolveProfileSlots(input: {
	layout: ProfileLayout;
	fieldsById: Map<string, LinkFieldRow>;
	answersByKey: Map<string, unknown>;
	visibility: Map<string, boolean>;
	owner: boolean;
}): ResolvedProfileSlots {
	const { layout, fieldsById, answersByKey, visibility, owner } = input;
	const out: ResolvedProfileSlots = {
		subtitle: null,
		bio: null,
		stats: [],
		socials: [],
		email: null,
	};

	function single(
		slot: ProfileSlotKey,
		fieldId: string | null | undefined,
	): { value: string; hidden: boolean } | null {
		if (!fieldId) return null;
		const field = fieldsById.get(fieldId);
		if (!field || !field.isActive || !isCompatible(slot, field.type)) {
			return null;
		}
		const raw = answersByKey.get(field.key);
		if (isEmptyAnswer(raw)) return null;
		const value = formatProfileValue(raw, field.type);
		if (!value) return null;
		const hidden = field.required && visibility.get(fieldId) === false;
		if (!owner && hidden) return null;
		return { value, hidden };
	}

	out.subtitle = single("subtitle", layout.subtitleFieldId);
	out.bio = single("bio", layout.bioFieldId);
	out.email = single("email", layout.emailFieldId);

	for (const item of layout.stats.slice(0, 5)) {
		const field = fieldsById.get(item.fieldId);
		if (!field || !field.isActive || !isCompatible("stats", field.type)) {
			continue;
		}
		const raw = answersByKey.get(field.key);
		if (isEmptyAnswer(raw)) continue;
		const value = formatProfileValue(raw, field.type);
		if (!value) continue;
		const hidden = field.required && visibility.get(item.fieldId) === false;
		if (!owner && hidden) continue;
		out.stats.push({ label: item.label, icon: item.icon, value, hidden });
	}

	if (layout.socialsFieldId) {
		const field = fieldsById.get(layout.socialsFieldId);
		if (
			field &&
			field.isActive &&
			isCompatible("socials", field.type)
		) {
			const raw = answersByKey.get(field.key);
			if (Array.isArray(raw)) {
				const hidden =
					field.required &&
					visibility.get(layout.socialsFieldId) === false;
				if (owner || !hidden) {
					for (const entry of raw) {
						if (
							typeof entry !== "object" ||
							entry === null ||
							!("service" in entry) ||
							!("value" in entry)
						) {
							continue;
						}
						const service = socialServiceById(
							String((entry as { service: unknown }).service),
						);
						if (!service) continue;
						const url = normalizeSocialLink(
							service.id,
							String((entry as { value: unknown }).value ?? ""),
						);
						if (!url) continue;
						out.socials.push({
							service: service.id,
							label: service.label,
							url,
							display: socialDisplayHandle(url),
							hidden,
						});
					}
				}
			}
		}
	}

	return out;
}

async function loadParticipantAnswers(participantId: string) {
	const rows = await db.query.formAnswer.findMany({
		where: eq(formAnswer.participantId, participantId),
		with: { field: { columns: { key: true } } },
	});
	const byKey = new Map<string, unknown>();
	const sorted = [...rows].sort(
		(a, b) =>
			new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);
	for (const row of sorted) {
		const key =
			(row.fieldSnapshot as { key?: string } | null)?.key ??
			row.field?.key;
		if (!key || byKey.has(key)) continue;
		let value: unknown = row.valueJson ?? row.valueNumber ?? row.valueDate;
		if (value === null || value === undefined) value = row.valueText;
		byKey.set(key, value);
	}
	return byKey;
}

async function loadVisibility(participantId: string) {
	const rows = await db.query.profileFieldVisibility.findMany({
		where: eq(profileFieldVisibility.participantId, participantId),
	});
	return new Map(rows.map((r) => [r.fieldId, r.visible]));
}

export const profilesRouter = createTRPCRouter({
	/** Participante atual no evento (com shortId; preenche se ausente). */
	getMyParticipant: protectedProcedure
		.input(z.object({ projectUrl: z.string() }))
		.query(async ({ input, ctx }) => {
			const projectId = await resolveProjectId(input.projectUrl);
			const row = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, projectId),
					eq(participant.userId, ctx.session.user.id),
				),
			});
			if (!row) return null;
			const shortId = await ensureShortId(row.id, row.shortId);
			return { participantId: row.id, shortId };
		}),

	/** Layout do perfil do evento (público: sem PII). */
	getProfileLayout: publicProcedure
		.input(z.object({ projectUrl: z.string() }))
		.query(async ({ input }) => {
			const projectId = await resolveProjectId(input.projectUrl);
			return readProjectLayout(projectId);
		}),

	/** Dados públicos do perfil: layout + respostas + visibilidade aplicada. */
	getProfilePageData: publicProcedure
		.input(z.object({ projectUrl: z.string(), shortId: z.string() }))
		.query(async ({ input }) => {
			const projectRow = await db.query.project.findFirst({
				where: eq(project.url, input.projectUrl),
				columns: { id: true, profilesEnabled: true, profileLayout: true },
			});
			if (!projectRow?.profilesEnabled) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Perfil não encontrado." });
			}
			const layout = parseProfileLayout(projectRow.profileLayout);
			const row = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, projectRow.id),
					eq(participant.shortId, input.shortId),
				),
				with: { user: { columns: { name: true, image_url: true } } },
			});
			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Perfil não encontrado." });
			}
			const ids = [
				layout.subtitleFieldId,
				layout.bioFieldId,
				layout.socialsFieldId,
				layout.emailFieldId,
				...layout.stats.map((s) => s.fieldId),
			].filter((id): id is string => Boolean(id));
			const fields =
				ids.length > 0
					? await db.query.formField.findMany({
							where: and(
								eq(formField.projectId, projectRow.id),
								inArray(formField.id, ids),
							),
							columns: {
								id: true,
								key: true,
								type: true,
								required: true,
								isActive: true,
							},
						})
					: [];
			const fieldsById = new Map(fields.map((f) => [f.id, f]));
			const [answersByKey, visibility] = await Promise.all([
				loadParticipantAnswers(row.id),
				loadVisibility(row.id),
			]);
			const slots = resolveProfileSlots({
				layout,
				fieldsById,
				answersByKey,
				visibility,
				owner: false,
			});
			return {
				shortId: row.shortId,
				name: row.user.name,
				avatarUrl: row.user.image_url,
				slots,
				modules: {
					connectionsEnabled: layout.connectionsEnabled,
					badgesEnabled: layout.badgesEnabled,
				},
			};
		}),

	/** Dados completos do dono (inclui ocultos + mapa de visibilidade). */
	getMyProfileData: protectedProcedure
		.input(z.object({ projectUrl: z.string() }))
		.query(async ({ input, ctx }) => {
			const projectRow = await db.query.project.findFirst({
				where: eq(project.url, input.projectUrl),
				columns: {
					id: true,
					profilesEnabled: true,
					profileLayout: true,
				},
			});
			if (!projectRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
			}
			const layout = parseProfileLayout(projectRow.profileLayout);
			const row = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, projectRow.id),
					eq(participant.userId, ctx.session.user.id),
				),
				with: {
					user: {
						columns: { name: true, email: true, image_url: true },
					},
				},
			});
			if (!row) return null;
			const shortId = await ensureShortId(row.id, row.shortId);
			const ids = [
				layout.subtitleFieldId,
				layout.bioFieldId,
				layout.socialsFieldId,
				layout.emailFieldId,
				...layout.stats.map((s) => s.fieldId),
			].filter((id): id is string => Boolean(id));
			const fields =
				ids.length > 0
					? await db.query.formField.findMany({
							where: and(
								eq(formField.projectId, projectRow.id),
								inArray(formField.id, ids),
							),
							columns: {
								id: true,
								key: true,
								type: true,
								required: true,
								isActive: true,
							},
						})
					: [];
			const fieldsById = new Map(fields.map((f) => [f.id, f]));
			const [answersByKey, visibility] = await Promise.all([
				loadParticipantAnswers(row.id),
				loadVisibility(row.id),
			]);
			const slots = resolveProfileSlots({
				layout,
				fieldsById,
				answersByKey,
				visibility,
				owner: true,
			});
			return {
				participantId: row.id,
				shortId,
				name: row.user.name,
				accountEmail: row.user.email,
				avatarUrl: row.user.image_url,
				slots,
				visibility: Object.fromEntries(visibility),
				modules: {
					connectionsEnabled: layout.connectionsEnabled,
					badgesEnabled: layout.badgesEnabled,
				},
			};
		}),

	/** Alterna visibilidade de campo obrigatório ligado (só o dono). */
	setFieldVisibility: protectedProcedure
		.input(
			z.object({
				projectUrl: z.string(),
				fieldId: z.string().uuid(),
				visible: z.boolean(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const projectId = await resolveProjectId(input.projectUrl);
			const row = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, projectId),
					eq(participant.userId, ctx.session.user.id),
				),
			});
			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Inscrição não encontrada." });
			}
			const field = await db.query.formField.findFirst({
				where: and(
					eq(formField.id, input.fieldId),
					eq(formField.projectId, projectId),
				),
				columns: { id: true, required: true },
			});
			if (!field) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Campo não encontrado." });
			}
			const layout = await readProjectLayout(projectId);
			const slot = slotForField(layout, input.fieldId);
			if (!slot || !field.required) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Visibilidade só existe p/ campos obrigatórios ligados ao perfil.",
				});
			}
			await db
				.insert(profileFieldVisibility)
				.values({
					participantId: row.id,
					fieldId: input.fieldId,
					visible: input.visible,
				})
				.onConflictDoUpdate({
					target: [
						profileFieldVisibility.participantId,
						profileFieldVisibility.fieldId,
					],
					set: { visible: input.visible },
				});
			return { visible: input.visible };
		}),
});
