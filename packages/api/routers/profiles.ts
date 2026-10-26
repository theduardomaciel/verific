import { TRPCError } from "@trpc/server";

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
	formatProfileValue,
	normalizeSocialLink,
	parseProfileLayout,
	profileLayoutSchema,
	socialDisplayHandle,
	socialServiceById,
	type ProfileLayout,
	type ProfileSlotKey,
	type StatIconKey,
} from "@verific/drizzle/profile-layout";
import {
	formField,
	formVersion,
	participant,
	profileConnection,
	profileFieldVisibility,
	project,
	activity,
	participantOnActivity,
} from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import { eventAnswerRows, latestByKey } from "../lib/event-answers";
import { evaluateStickers } from "../lib/gamification";
import {
	dropVisibilityForKeys,
	getLinkedFieldRows,
	isCompatible,
	linkedFieldIds,
	readProjectLayout,
	writeProjectLayout,
} from "../lib/profile-links";
import { requireProjectAccess } from "../lib/project-access";
import { generateShortId } from "../lib/short-id";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

/**
 * Preenche shortId ausente (participantes criados antes da coluna existir).
 *
 * Caminho quente: quem já tem shortId retorna sem query nem write — as
 * procedures de leitura (`getMyParticipant`, `getMyEnrollmentState`, badges)
 * não pagam nada por esse fallback. Só linhas legadas com `short_id NULL`
 * escrevem; o UPDATE é condicional (`IS NULL`) para não sobrescrever um id
 * gerado por outra requisição concorrente.
 */
export async function ensureShortId(
	participantId: string,
	current: string | null,
): Promise<string> {
	if (current) return current;

	let lastError: unknown = null;
	for (let i = 0; i < 5; i++) {
		const shortId = generateShortId();
		try {
			const updated = await db
				.update(participant)
				.set({ shortId })
				.where(
					and(
						eq(participant.id, participantId),
						isNull(participant.shortId),
					),
				)
				.returning({ shortId: participant.shortId });

			if (updated[0]?.shortId) return updated[0].shortId;

			// Outra requisição preencheu entre o SELECT e o UPDATE.
			const row = await db.query.participant.findFirst({
				where: eq(participant.id, participantId),
				columns: { shortId: true },
			});
			if (row?.shortId) return row.shortId;
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
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Evento não encontrado.",
		});
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
	/** Por chave do campo, como as respostas. */
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
		const hidden = field.required && visibility.get(field.key) === false;
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
		const hidden = field.required && visibility.get(field.key) === false;
		if (!owner && hidden) continue;
		out.stats.push({ label: item.label, icon: item.icon, value, hidden });
	}

	if (layout.socialsFieldId) {
		const field = fieldsById.get(layout.socialsFieldId);
		if (field && field.isActive && isCompatible("socials", field.type)) {
			const raw = answersByKey.get(field.key);
			if (Array.isArray(raw)) {
				const hidden =
					field.required && visibility.get(field.key) === false;
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
						const { service: serviceId, value } = entry as {
							service: unknown;
							value: unknown;
						};
						if (
							typeof serviceId !== "string" ||
							typeof value !== "string"
						) {
							continue;
						}
						const service = socialServiceById(serviceId);
						if (!service) continue;
						const url = normalizeSocialLink(service.id, value);
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
	return latestByKey(await eventAnswerRows(participantId));
}

/**
 * Visibilidade por pergunta (chave do campo), e não pelo id do campo de uma
 * versão: a escolha sobrevive a uma nova versão do formulário. Vale a da
 * versão mais recente.
 */
async function loadVisibility(participantId: string) {
	const rows = await db
		.select({
			key: formField.key,
			visible: profileFieldVisibility.visible,
		})
		.from(profileFieldVisibility)
		.innerJoin(formField, eq(formField.id, profileFieldVisibility.fieldId))
		.innerJoin(formVersion, eq(formVersion.id, formField.formVersionId))
		.where(
			and(
				eq(profileFieldVisibility.participantId, participantId),
				isNull(formVersion.activityId),
			),
		)
		.orderBy(desc(formVersion.version));
	const byKey = new Map<string, boolean>();
	for (const row of rows) {
		if (!byKey.has(row.key)) byKey.set(row.key, row.visible);
	}
	return byKey;
}

const PROFILE_CONNECTIONS_SAMPLE = 6;

/**
 * Conexões incoming do perfil: total + amostra recente de nomes.
 * Chamado só quando `connectionsEnabled`; fora disso retorna zero.
 */
async function loadProfileConnections(
	projectId: string,
	viewedParticipantId: string,
) {
	const [totalRows, sample] = await Promise.all([
		db
			.select({ n: count() })
			.from(profileConnection)
			.where(
				and(
					eq(profileConnection.projectId, projectId),
					eq(
						profileConnection.viewedParticipantId,
						viewedParticipantId,
					),
				),
			),
		db.query.profileConnection.findMany({
			where: and(
				eq(profileConnection.projectId, projectId),
				eq(profileConnection.viewedParticipantId, viewedParticipantId),
			),
			orderBy: desc(profileConnection.createdAt),
			limit: PROFILE_CONNECTIONS_SAMPLE + 1,
			with: {
				viewer: {
					with: {
						user: { columns: { name: true, image_url: true } },
					},
				},
			},
		}),
	]);
	const visitors = sample
		.map((r) => {
			const name = r.viewer?.user?.name?.trim();
			if (!name) return null;
			return { name, avatarUrl: r.viewer?.user?.image_url ?? null };
		})
		.filter(
			(v): v is { name: string; avatarUrl: string | null } => v !== null,
		);
	return { total: totalRows[0]?.n ?? 0, visitors };
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

	/** Estado autenticado do participante e atividades inscritas no evento. */
	getMyEnrollmentState: protectedProcedure
		.input(
			z.object({
				projectUrl: z.string(),
				// Only separates client cache entries between users. The
				// authenticated session remains the source of truth.
				clientSessionId: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const row = await db
				.select({
					projectId: project.id,
					participantId: participant.id,
					shortId: participant.shortId,
				})
				.from(project)
				.leftJoin(
					participant,
					and(
						eq(participant.projectId, project.id),
						eq(participant.userId, ctx.session.user.id),
					),
				)
				.where(eq(project.url, input.projectUrl))
				.limit(1);

			const current = row[0];
			if (!current?.participantId) return null;

			const shortId = await ensureShortId(
				current.participantId,
				current.shortId,
			);
			const activities = await db
				.select({ activityId: participantOnActivity.activityId })
				.from(participantOnActivity)
				.innerJoin(
					activity,
					eq(activity.id, participantOnActivity.activityId),
				)
				.where(
					and(
						eq(
							participantOnActivity.participantId,
							current.participantId,
						),
						eq(activity.projectId, current.projectId),
						isNull(activity.cancelledAt),
					),
				);

			return {
				participantId: current.participantId,
				shortId,
				activityIds: activities.map((item) => item.activityId),
			};
		}),

	/** Layout do perfil do evento (público: sem PII). */
	getProfileLayout: publicProcedure
		.input(z.object({ projectUrl: z.string() }))
		.query(async ({ input }) => {
			const projectId = await resolveProjectId(input.projectUrl);
			return readProjectLayout(projectId);
		}),

	/**
	 * Campos elegíveis p/ links: os da versão publicada do formulário do
	 * evento (um rascunho pode ser excluído e levar o link junto). Sem versão
	 * publicada, a mais recente.
	 */
	getProfileFieldOptions: protectedProcedure
		.input(z.object({ projectId: z.string().uuid() }))
		.query(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const versions = await db.query.formVersion.findMany({
				where: and(
					eq(formVersion.projectId, input.projectId),
					isNull(formVersion.activityId),
				),
				orderBy: desc(formVersion.version),
				columns: { id: true, version: true, isPublished: true },
			});
			const version = versions.find((v) => v.isPublished) ?? versions[0];
			if (!version) return { version: null, fields: [] };
			const fields = await db.query.formField.findMany({
				where: and(
					eq(formField.formVersionId, version.id),
					eq(formField.isActive, true),
				),
				columns: {
					id: true,
					key: true,
					label: true,
					type: true,
					required: true,
				},
				orderBy: asc(formField.order),
			});
			return {
				version: {
					id: version.id,
					version: version.version,
					isPublished: version.isPublished,
				},
				fields,
			};
		}),

	/** Salva o layout do perfil (valida compatibilidade tipo/slot). */
	updateProfileLayout: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				layout: profileLayoutSchema,
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const layout = input.layout;
			const ids = [
				layout.subtitleFieldId,
				layout.bioFieldId,
				layout.socialsFieldId,
				layout.emailFieldId,
				...layout.stats.map((s) => s.fieldId),
			].filter((id): id is string => Boolean(id));
			if (ids.length > 0) {
				const rows = await db.query.formField.findMany({
					where: and(
						eq(formField.projectId, input.projectId),
						inArray(formField.id, ids),
					),
					columns: { id: true, type: true },
				});
				const byId = new Map(rows.map((r) => [r.id, r.type]));
				const check = (
					slot: "subtitle" | "bio" | "socials" | "email",
					id: string | null | undefined,
				) => {
					if (!id) return;
					const type = byId.get(id);
					if (!type || !isCompatible(slot, type)) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message:
								"Campo ligado incompatível ou inexistente.",
						});
					}
				};
				check("subtitle", layout.subtitleFieldId);
				check("bio", layout.bioFieldId);
				check("socials", layout.socialsFieldId);
				check("email", layout.emailFieldId);
				layout.stats.forEach((s, i) => {
					const type = byId.get(s.fieldId);
					if (!type || !isCompatible("stats", type)) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Item ${i + 1} dos stats incompatível ou inexistente.`,
						});
					}
				});
			}
			const before = await readProjectLayout(input.projectId);
			const [beforeRows, afterRows] = await Promise.all([
				getLinkedFieldRows(linkedFieldIds(before)),
				getLinkedFieldRows(ids),
			]);
			// A escolha de visibilidade é por pergunta: só some quando a
			// pergunta deixa de estar no perfil
			const afterKeys = new Set(afterRows.map((f) => f.key));
			const removedKeys = beforeRows
				.map((f) => f.key)
				.filter((key) => !afterKeys.has(key));
			await writeProjectLayout(input.projectId, layout);
			await dropVisibilityForKeys(input.projectId, removedKeys);
			return { saved: true };
		}),

	/** Dados públicos do perfil: layout + respostas + visibilidade aplicada. */
	getProfilePageData: publicProcedure
		.input(z.object({ projectUrl: z.string(), shortId: z.string() }))
		.query(async ({ input }) => {
			const projectRow = await db.query.project.findFirst({
				where: eq(project.url, input.projectUrl),
				columns: {
					id: true,
					profilesEnabled: true,
					profileLayout: true,
				},
			});
			if (!projectRow?.profilesEnabled) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Perfil não encontrado.",
				});
			}
			const layout = parseProfileLayout(projectRow.profileLayout);
			const ids = [
				layout.subtitleFieldId,
				layout.bioFieldId,
				layout.socialsFieldId,
				layout.emailFieldId,
				...layout.stats.map((s) => s.fieldId),
			].filter((id): id is string => Boolean(id));

			// Campos do layout e participante em paralelo: nenhum depende do
			// outro (só do id do projeto). A resposta encadeada custava um
			// round-trip extra no primeiro render de cada perfil.
			const [row, fields] = await Promise.all([
				db.query.participant.findFirst({
					where: and(
						eq(participant.projectId, projectRow.id),
						eq(participant.shortId, input.shortId),
					),
					with: {
						user: { columns: { name: true, image_url: true } },
					},
				}),
				ids.length > 0
					? db.query.formField.findMany({
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
					: Promise.resolve([]),
			]);
			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Perfil não encontrado.",
				});
			}
			const fieldsById = new Map(fields.map((f) => [f.id, f]));
			// Respostas, visibilidade e conexões também não dependem entre si.
			const [answersByKey, visibility, connections] = await Promise.all([
				loadParticipantAnswers(row.id),
				loadVisibility(row.id),
				layout.connectionsEnabled
					? loadProfileConnections(projectRow.id, row.id)
					: Promise.resolve({
							total: 0,
							visitors: [] as Array<{
								name: string;
								avatarUrl: string | null;
							}>,
						}),
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
				connections,
				modules: {
					connectionsEnabled: layout.connectionsEnabled,
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
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Evento não encontrado.",
				});
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
				// Por chave do campo: o formulário de edição mostra a versão
				// publicada, e o layout pode apontar para outra
				visibility: Object.fromEntries(visibility),
				linkedKeys: [
					...new Set(
						fields.filter((f) => f.isActive).map((f) => f.key),
					),
				],
				modules: {
					connectionsEnabled: layout.connectionsEnabled,
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
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Inscrição não encontrada.",
				});
			}
			const [field] = await db
				.select({ key: formField.key, required: formField.required })
				.from(formField)
				.innerJoin(
					formVersion,
					eq(formVersion.id, formField.formVersionId),
				)
				.where(
					and(
						eq(formField.id, input.fieldId),
						eq(formField.projectId, projectId),
						isNull(formVersion.activityId),
					),
				);
			if (!field) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Campo não encontrado.",
				});
			}
			// O layout pode apontar para o campo de mesma chave de outra versão
			const linked = await getLinkedFieldRows(
				linkedFieldIds(await readProjectLayout(projectId)),
			);
			if (!field.required || !linked.some((f) => f.key === field.key)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Visibilidade só existe p/ campos obrigatórios ligados ao perfil.",
				});
			}
			// Mesma escolha em todas as versões da pergunta
			const sameQuestion = await db
				.select({ id: formField.id })
				.from(formField)
				.innerJoin(
					formVersion,
					eq(formVersion.id, formField.formVersionId),
				)
				.where(
					and(
						eq(formField.projectId, projectId),
						eq(formField.key, field.key),
						isNull(formVersion.activityId),
					),
				);
			await db
				.insert(profileFieldVisibility)
				.values(
					sameQuestion.map((f) => ({
						participantId: row.id,
						fieldId: f.id,
						visible: input.visible,
					})),
				)
				.onConflictDoUpdate({
					target: [
						profileFieldVisibility.participantId,
						profileFieldVisibility.fieldId,
					],
					set: { visible: input.visible },
				});
			return { visible: input.visible };
		}),

	/**
	 * Registra visita = conexão direcional (viewer -> viewed).
	 * Só participantes do mesmo evento; self-visit e anônimos ignorados.
	 * Idempotente via PK (viewer, viewed): repetição não infla.
	 */
	recordProfileVisit: publicProcedure
		.input(
			z.object({
				// O perfil já conhece o projeto: receber o id evita resolver a
				// URL de novo aqui e no snapshot de invalidação de cache.
				projectId: z.string().uuid(),
				shortId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			// O cliente não consulta mais `/api/auth/get-session` antes:
			// esta mutation lê a sessão do próprio contexto. Anônimos saem
			// antes de qualquer query.
			const userId = ctx.session?.user?.id;
			if (!userId) {
				return { recorded: false };
			}

			const projectRow = await db.query.project.findFirst({
				where: eq(project.id, input.projectId),
				columns: {
					id: true,
					ownerId: true,
					profilesEnabled: true,
					profileLayout: true,
					gamification: true,
					startDate: true,
					endDate: true,
				},
			});
			if (!projectRow?.profilesEnabled) {
				return { recorded: false };
			}
			if (
				!parseProfileLayout(projectRow.profileLayout).connectionsEnabled
			) {
				return { recorded: false };
			}
			// Conexões só existem durante o evento. O cliente já evita a
			// chamada fora da janela; repetir aqui protege contra relógio
			// adiantado e clientes antigos em cache.
			const now = Date.now();
			if (
				now < projectRow.startDate.getTime() ||
				now > projectRow.endDate.getTime()
			) {
				return { recorded: false };
			}
			const [viewed, viewer] = await Promise.all([
				db.query.participant.findFirst({
					where: and(
						eq(participant.projectId, projectRow.id),
						eq(participant.shortId, input.shortId),
					),
					columns: { id: true },
				}),
				db.query.participant.findFirst({
					where: and(
						eq(participant.projectId, projectRow.id),
						eq(participant.userId, userId),
					),
					columns: { id: true },
				}),
			]);
			if (!viewed || !viewer || viewer.id === viewed.id) {
				return { recorded: false };
			}
			const inserted = await db
				.insert(profileConnection)
				.values({
					viewerParticipantId: viewer.id,
					viewedParticipantId: viewed.id,
					projectId: projectRow.id,
				})
				.onConflictDoNothing()
				.returning({
					viewerParticipantId: profileConnection.viewerParticipantId,
				});
			// Conexões novas podem desbloquear o adesivo Conector. Roda
			// fora da resposta crítica e nunca falha a visita.
			if (inserted.length > 0) {
				try {
					await evaluateStickers(db, projectRow, viewed.id);
				} catch {
					// Gamificação é acessória.
				}
			}

			// `recorded` mantém a semântica do cliente (visita aceita); o
			// `created` diz se houve linha nova e é o que decide a invalidação
			// do perfil visitado. Repetir a visita não regenera o ISR.
			return { recorded: true, created: inserted.length > 0 };
		}),
});
