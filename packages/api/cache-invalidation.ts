import { db } from "@verific/drizzle";
import { and, eq, inArray } from "@verific/drizzle/orm";
import {
	activity,
	activitySession,
	formField,
	formSection,
	formVersion,
	participant,
	project,
	speaker,
	speakerOnActivity,
	tag,
	tagOnActivity,
} from "@verific/drizzle/schema";

import {
	activityAvailabilityCacheTag,
	activityCacheTag,
	GLOBAL_CACHE_TAGS,
	participantProfileCacheTag,
	profileLayoutCacheTag,
	projectActivitiesCacheTag,
	projectCacheTag,
	projectFormCacheTag,
	projectGamificationCacheTag,
	projectProfilesCacheTag,
	projectUrlCacheTag,
} from "./cache-tags";
import { userOwnedProjectIds, userProfileRefs } from "./lib/user-public-scope";

/**
 * Invalidação on-demand do cache público (Next `cacheComponents`).
 *
 * Um único registro declarativo mapeia o **caminho do procedimento** → tags
 * a invalidar, aplicado por middleware em TODAS as mutations (ver
 * `trpc.ts`). Nenhum handler precisa lembrar de invalidar; e como só
 * mutations passam pelo caminho pesado, queries não pagam nada.
 *
 * Atenção: as chaves são os caminhos REAIS do tRPC — o `appRouter` é um
 * `mergeRouters` de routers planos, então o caminho é `updateActivity`,
 * não `activities.updateActivity`. Uma chave errada nunca casa (falha
 * silenciosa): ao adicionar um router, confira `Object.keys(appRouter
 * ._def.procedures)`.
 *
 * Semântica: `revalidateTag(tag, "max")` (stale-while-revalidate) — a
 * invalidação apenas marca a entrada como stale; o próximo visitante
 * recebe a versão antiga e a regeneração acontece em background, sem
 * regenerar tudo junto da mutação.
 *
 * Regras que **não** aparecem aqui foram omitidas de propósito: mutations
 * de dashboard (contribuidores, notificações, badges, uploads, preferências)
 * não alimentam nenhuma leitura pública cacheada — invalidá-las só gastaria
 * regenerações.
 */

type SessionLike = { user?: { id?: string } | null } | null;

export type MutationCacheContext = {
	session: SessionLike;
};

export type MutationCacheArgs = {
	input: unknown;
	result: unknown;
	ctx: MutationCacheContext;
	snapshot: unknown;
};

type MutationCacheRule = {
	/**
	 * Leitura extra ANTES da mutation (linhas antigas que o handler pode
	 * apagar/trocar — url antiga, atividades afetadas). Nunca pode derrubar
	 * a mutation: erro é capturado pelo middleware e vira `undefined`.
	 */
	snapshot?: (input: unknown, ctx: MutationCacheContext) => Promise<unknown>;
	tags: (args: MutationCacheArgs) => (string | undefined | false)[];
};

// ────────────────────────────── helpers ──────────────────────────────

function record(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: {};
}

function readString(value: unknown, key: string): string | undefined {
	const item = record(value)[key];
	return typeof item === "string" && item.length > 0 ? item : undefined;
}

function readNumber(value: unknown, key: string): number | undefined {
	const item = record(value)[key];
	return typeof item === "number" ? item : undefined;
}

function readStringArray(value: unknown, key: string): string[] {
	const item = record(value)[key];
	if (typeof item === "string" && item.length > 0) return [item];
	return Array.isArray(item)
		? item.filter((entry): entry is string => typeof entry === "string")
		: [];
}

type ProfileRef = { projectId: string; shortId: string };

/** Refs `{ projectId, shortId }` devolvidas pelas mutations de identidade. */
function readProfileRefs(value: unknown, key: string): ProfileRef[] {
	const item = record(value)[key];
	if (!Array.isArray(item)) return [];

	return item.flatMap((entry) => {
		const projectId = readString(entry, "projectId");
		const shortId = readString(entry, "shortId");
		return projectId && shortId ? [{ projectId, shortId }] : [];
	});
}

function sessionUserId(ctx: MutationCacheContext): string | undefined {
	const id = ctx.session?.user?.id;
	return typeof id === "string" && id.length > 0 ? id : undefined;
}

async function projectIdByUrl(url: string | undefined) {
	if (!url) return undefined;
	const row = await db.query.project.findFirst({
		where: eq(project.url, url),
		columns: { id: true },
	});
	return row?.id;
}

async function activityProjectId(activityId: string | undefined) {
	if (!activityId) return undefined;
	const row = await db.query.activity.findFirst({
		where: eq(activity.id, activityId),
		columns: { projectId: true },
	});
	return row?.projectId;
}

/** Evento dono de uma sessão (usado pelo credenciamento de badge). */
async function sessionProjectId(sessionId: string | undefined) {
	if (!sessionId) return undefined;
	const [row] = await db
		.select({ projectId: activity.projectId })
		.from(activitySession)
		.innerJoin(activity, eq(activitySession.activityId, activity.id))
		.where(eq(activitySession.id, sessionId))
		.limit(1);
	return row?.projectId;
}

async function participantRowsByProjectUser(
	projectId: string | undefined,
	userId: string | undefined,
) {
	if (!projectId || !userId) return undefined;
	return db.query.participant.findFirst({
		where: and(
			eq(participant.projectId, projectId),
			eq(participant.userId, userId),
		),
		columns: { id: true, shortId: true },
	});
}

async function participantShortIds(
	projectId: string | undefined,
	participantIds: string[],
) {
	if (!projectId || participantIds.length === 0) return [];
	const rows = await db.query.participant.findMany({
		where: and(
			eq(participant.projectId, projectId),
			inArray(participant.id, participantIds),
		),
		columns: { shortId: true },
	});
	return rows.map((row) => row.shortId);
}

async function activityIdsForSpeaker(speakerId: number | undefined) {
	if (speakerId === undefined) return [];
	const rows = await db
		.select({ activityId: speakerOnActivity.activityId })
		.from(speakerOnActivity)
		.where(eq(speakerOnActivity.speakerId, speakerId));
	return rows.map((row) => row.activityId);
}

async function activityIdsForSpeakerProject(projectId: string | undefined) {
	if (!projectId) return [];
	const rows = await db
		.select({ activityId: speakerOnActivity.activityId })
		.from(speakerOnActivity)
		.innerJoin(speaker, eq(speaker.id, speakerOnActivity.speakerId))
		.where(eq(speaker.projectId, projectId));
	return rows.map((row) => row.activityId);
}

async function activityIdsForTag(tagId: string | undefined) {
	if (!tagId) return [];
	const rows = await db
		.select({ activityId: tagOnActivity.activityId })
		.from(tagOnActivity)
		.where(eq(tagOnActivity.tagId, tagId));
	return rows.map((row) => row.activityId);
}

async function versionById(versionId: string | undefined) {
	if (!versionId) return undefined;
	return db.query.formVersion.findFirst({
		where: eq(formVersion.id, versionId),
		columns: { projectId: true, activityId: true, isPublished: true },
	});
}

type VersionScope = {
	projectId?: string;
	activityId?: string | null;
	isPublished?: boolean | null;
};

/**
 * Tags comuns às mutations de formulário: o formulário **publicado** muda o
 * que a inscrição renderiza (escopo do evento) e o `hasForm`/resumo das
 * atividades (escopo de atividade). Rascunho não afeta nada público.
 */
function publishedFormTags(version: VersionScope) {
	if (!version.isPublished || !version.projectId) return [];
	const projectId = version.projectId;
	return version.activityId
		? [
				activityCacheTag(version.activityId),
				projectActivitiesCacheTag(projectId),
			]
		: [projectFormCacheTag(projectId)];
}

/** Snapshot padrão das mutations de atividade: o projeto dono. */
async function snapshotActivityProject(input: unknown) {
	const activityId = readString(input, "activityId");
	const projectId = await activityProjectId(activityId);
	let participantsLimit: number | null | undefined;
	if (activityId) {
		const act = await db.query.activity.findFirst({
			where: eq(activity.id, activityId),
			columns: { participantsLimit: true },
		});
		participantsLimit = act?.participantsLimit ?? null;
	}
	return {
		projectId,
		participantsLimit,
	};
}

// ────────────────────────────── registro ──────────────────────────────

export const mutationCacheRules: Record<string, MutationCacheRule> = {
	// ── projects ─────────────────────────────────────────────────────
	createProject: {
		tags: ({ result }) => {
			const id = readString(result, "id");
			const url = readString(result, "url");
			return [
				GLOBAL_CACHE_TAGS.projects,
				id ? projectCacheTag(id) : undefined,
				url ? projectUrlCacheTag(url) : undefined,
			];
		},
	},

	updateProject: {
		snapshot: async (input) => {
			const id = readString(input, "id");
			if (!id) return undefined;
			const row = await db.query.project.findFirst({
				where: eq(project.id, id),
				columns: { url: true },
			});
			return { previousUrl: row?.url };
		},
		tags: ({ input, result, snapshot }) => {
			const id = readString(input, "id");
			// A URL gravada pode ter sido normalizada
			const nextUrl = readString(result, "url");
			const previousUrl = readString(snapshot, "previousUrl");
			return [
				// A lista pública só tem id e URL
				nextUrl !== previousUrl
					? GLOBAL_CACHE_TAGS.projects
					: undefined,
				id ? projectCacheTag(id) : undefined,
				previousUrl ? projectUrlCacheTag(previousUrl) : undefined,
				nextUrl && nextUrl !== previousUrl
					? projectUrlCacheTag(nextUrl)
					: undefined,
			];
		},
	},

	updateGamificationSettings: {
		snapshot: async (input) => {
			const id = readString(input, "projectId");
			if (!id) return undefined;
			const row = await db.query.project.findFirst({
				where: eq(project.id, id),
				columns: { url: true },
			});
			return { url: row?.url };
		},
		tags: ({ input, snapshot }) => {
			const id = readString(input, "projectId");
			const url = readString(snapshot, "url");
			return [
				id ? projectCacheTag(id) : undefined,
				id ? projectGamificationCacheTag(id) : undefined,
				url ? projectUrlCacheTag(url) : undefined,
			];
		},
	},

	deleteProject: {
		snapshot: async (input) => {
			const id = readString(input, "id");
			if (!id) return undefined;
			const [row, activities] = await Promise.all([
				db.query.project.findFirst({
					where: eq(project.id, id),
					columns: { url: true },
				}),
				db.query.activity.findMany({
					where: eq(activity.projectId, id),
					columns: { id: true },
				}),
			]);
			return {
				url: row?.url,
				activityIds: activities.map((item) => item.id),
			};
		},
		tags: ({ input, snapshot }) => {
			const id = readString(input, "id");
			if (!id) return [];
			const url = readString(snapshot, "url");
			return [
				GLOBAL_CACHE_TAGS.projects,
				projectCacheTag(id),
				url ? projectUrlCacheTag(url) : undefined,
				projectActivitiesCacheTag(id),
				projectProfilesCacheTag(id),
				projectFormCacheTag(id),
				profileLayoutCacheTag(id),
				...readStringArray(snapshot, "activityIds").map(
					activityCacheTag,
				),
			];
		},
	},

	// ── users ────────────────────────────────────────────────────────
	// O nome aparece na landing (dono) e no perfil público. Sem mudança real,
	// nada é invalidado; com mudança, só as entradas do próprio usuário e as
	// landings dos eventos que ele possui.
	updateUser: {
		tags: ({ result }) => {
			if (!record(result).nameChanged) return [];
			return [
				...readProfileRefs(result, "profileRefs").map(
					({ projectId, shortId }) =>
						participantProfileCacheTag(projectId, shortId),
				),
				...readStringArray(result, "ownedProjectIds").map(
					projectCacheTag,
				),
			];
		},
	},

	// ── activities ───────────────────────────────────────────────────
	createActivity: {
		tags: ({ input, result }) => {
			const projectId = readString(input, "projectId");
			const activityId = readString(result, "activityId");
			return [
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				activityId ? activityCacheTag(activityId) : undefined,
			];
		},
	},

	updateActivity: {
		snapshot: snapshotActivityProject,
		tags: ({ input, snapshot }) => {
			const activityId = readString(input, "activityId");
			const projectId = readString(snapshot, "projectId");
			const participantsLimit = readNumber(input, "participantsLimit");
			const oldParticipantsLimit = readNumber(
				snapshot,
				"participantsLimit",
			);
			const tags = [
				activityId ? activityCacheTag(activityId) : undefined,
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
			];
			// Invalidate availability cache when seat limit changes
			if (
				activityId &&
				participantsLimit !== undefined &&
				participantsLimit !== oldParticipantsLimit
			) {
				tags.push(activityAvailabilityCacheTag(activityId));
			}
			return tags;
		},
	},

	// `updateActivityParticipants` e `addMonitorsToActivity` só mudam
	// vagas/contagens (monitor não aparece no payload público anônimo): a
	// disponibilidade vem de `getActivityAvailability` (s-maxage=60), então
	// regenerar o shell estático aqui seria desperdício.
	//
	// `addActivityParticipants` também pode gravar respostas de formulário no
	// perfil de quem foi inscrito — mas só desses participantes, não do evento
	// inteiro.
	addActivityParticipants: {
		// Sem respostas, o resultado já traz o evento: nenhuma leitura extra
		snapshot: async (input) => {
			if (!record(input).formAnswers) return undefined;
			const projectId = await activityProjectId(
				readString(input, "activityId"),
			);
			return {
				shortIds: await participantShortIds(
					projectId,
					readStringArray(input, "participantsIdsToAdd"),
				),
			};
		},
		tags: ({ input, result, snapshot }) => {
			const projectId = readString(result, "projectId");
			if (!projectId) return [];
			return [
				// Inscrição concede pontos (quando ligados) e muda o ranking.
				projectGamificationCacheTag(projectId),
				// Sem respostas não há mudança no perfil público.
				...(!record(input).formAnswers
					? []
					: readStringArray(snapshot, "shortIds").map((shortId) =>
							participantProfileCacheTag(projectId, shortId),
						)),
			];
		},
	},

	deleteActivity: {
		snapshot: snapshotActivityProject,
		tags: ({ input, snapshot }) => {
			const activityId = readString(input, "activityId");
			const projectId = readString(snapshot, "projectId");
			return [
				activityId ? activityCacheTag(activityId) : undefined,
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
			];
		},
	},

	setActivitiesRegistration: {
		tags: ({ input }) => {
			const projectId = readString(input, "projectId");
			return [
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				...readStringArray(input, "activityIds").map(activityCacheTag),
			];
		},
	},

	// ── participantOnActivities ──────────────────────────────────────
	deleteParticipantFromActivity: {
		snapshot: async (input) => {
			const participantId = readString(input, "participantId");
			const row = participantId
				? await db.query.participant.findFirst({
						where: eq(participant.id, participantId),
						columns: { projectId: true, shortId: true },
					})
				: undefined;
			return { projectId: row?.projectId, shortId: row?.shortId };
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			const shortId = readString(snapshot, "shortId");
			// Só o perfil de quem saiu pode mudar; a contagem da atividade fica
			// na query pública de disponibilidade.
			return [
				projectId && shortId
					? participantProfileCacheTag(projectId, shortId)
					: undefined,
				// A saída revoga pontos de inscrição/presença.
				projectId ? projectGamificationCacheTag(projectId) : undefined,
			];
		},
	},

	// ── participants ─────────────────────────────────────────────────
	// `updateSessionPresence` (check-in de badge) não muda o HTML público,
	// mas concede pontos e pode desbloquear adesivos: invalida o cache de
	// gamificação do evento (ranking + snapshots dos perfis).
	updateSessionPresence: {
		snapshot: async (input) => ({
			projectId: await sessionProjectId(readString(input, "sessionId")),
		}),
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			return [
				projectId ? projectGamificationCacheTag(projectId) : undefined,
			];
		},
	},

	// ── gamification ─────────────────────────────────────────────────
	checkInParticipant: {
		tags: ({ input }) => {
			const projectId = readString(input, "projectId");
			return [
				projectId ? projectGamificationCacheTag(projectId) : undefined,
			];
		},
	},

	awardManualPoints: {
		tags: ({ input }) => {
			const projectId = readString(input, "projectId");
			return [
				projectId ? projectGamificationCacheTag(projectId) : undefined,
			];
		},
	},

	grantParticipantSticker: {
		tags: ({ input }) => {
			const projectId = readString(input, "projectId");
			return [
				projectId ? projectGamificationCacheTag(projectId) : undefined,
			];
		},
	},

	setRankingOptOut: {
		tags: ({ input }) => {
			const projectId = readString(input, "projectId");
			return [
				projectId ? projectGamificationCacheTag(projectId) : undefined,
			];
		},
	},

	removeParticipant: {
		snapshot: async (input) => {
			const participantId = readString(input, "participantId");
			const row = participantId
				? await db.query.participant.findFirst({
						where: eq(participant.id, participantId),
						columns: { projectId: true, shortId: true },
					})
				: undefined;
			return {
				projectId: row?.projectId,
				shortId: row?.shortId,
			};
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			const shortId = readString(snapshot, "shortId");
			return [
				// Remover o participante apaga conexões dele: os perfis que
				// listavam essa pessoa também mudam.
				projectId ? projectProfilesCacheTag(projectId) : undefined,
				projectId && shortId
					? participantProfileCacheTag(projectId, shortId)
					: undefined,
				// Pontos e adesivos do participante somem do ranking.
				projectId ? projectGamificationCacheTag(projectId) : undefined,
			];
		},
	},

	removeSelfFromEvent: {
		snapshot: async (input, ctx) => {
			const projectId = readString(input, "projectId");
			const row = await participantRowsByProjectUser(
				projectId,
				sessionUserId(ctx),
			);
			return {
				projectId,
				shortId: row?.shortId,
			};
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			const shortId = readString(snapshot, "shortId");
			return [
				projectId ? projectProfilesCacheTag(projectId) : undefined,
				projectId && shortId
					? participantProfileCacheTag(projectId, shortId)
					: undefined,
			];
		},
	},

	// ── waitlist ─────────────────────────────────────────────────────
	// A contagem (inclusive ofertas "offered") vive em
	// `getActivityAvailability`; por isso nenhuma dessas mutations invalida
	// atividade, lista ou o guarda-chuva de perfis. A única mudança pública
	// possível é o perfil de quem entrou, quando o join grava respostas.
	joinActivityWaitlist: {
		snapshot: async (input, ctx) => {
			const projectId = await activityProjectId(
				readString(input, "activityId"),
			);
			const row = await participantRowsByProjectUser(
				projectId,
				sessionUserId(ctx),
			);
			return { projectId, shortId: row?.shortId };
		},
		tags: ({ input, snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			const shortId = readString(snapshot, "shortId");
			return [
				// Entrar direto (vaga livre) concede pontos de inscrição.
				projectId ? projectGamificationCacheTag(projectId) : undefined,
				...(record(input).formAnswers && projectId && shortId
					? [participantProfileCacheTag(projectId, shortId)]
					: []),
			];
		},
	},

	confirmWaitlistOffer: {
		snapshot: snapshotActivityProject,
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			return [
				projectId ? projectGamificationCacheTag(projectId) : undefined,
			];
		},
	},

	promoteFromWaitlist: {
		snapshot: snapshotActivityProject,
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			return [
				projectId ? projectGamificationCacheTag(projectId) : undefined,
			];
		},
	},

	// ── tags (categorias de atividade) ───────────────────────────────
	createTag: {
		tags: ({ input }) => {
			const projectId = readString(input, "projectId");
			return [
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
			];
		},
	},

	renameTag: {
		snapshot: async (input) => {
			const tagId = readString(input, "tagId");
			const row = tagId
				? await db.query.tag.findFirst({
						where: eq(tag.id, tagId),
						columns: { projectId: true },
					})
				: undefined;
			return {
				projectId: row?.projectId,
				activityIds: await activityIdsForTag(tagId),
			};
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			return [
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				...readStringArray(snapshot, "activityIds").map(
					activityCacheTag,
				),
			];
		},
	},

	deleteTag: {
		snapshot: async (input) => {
			const tagId = readString(input, "tagId");
			const row = tagId
				? await db.query.tag.findFirst({
						where: eq(tag.id, tagId),
						columns: { projectId: true },
					})
				: undefined;
			return {
				projectId: row?.projectId,
				activityIds: await activityIdsForTag(tagId),
			};
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			return [
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				...readStringArray(snapshot, "activityIds").map(
					activityCacheTag,
				),
			];
		},
	},

	// ── speakers ─────────────────────────────────────────────────────
	createSpeaker: {
		tags: ({ input }) => {
			const projectId = readString(input, "projectId");
			return [
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
			];
		},
	},

	updateSpeaker: {
		snapshot: async (input) => ({
			projectId: readString(input, "projectId"),
			activityIds: await activityIdsForSpeaker(readNumber(input, "id")),
		}),
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			return [
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				...readStringArray(snapshot, "activityIds").map(
					activityCacheTag,
				),
			];
		},
	},

	deleteSpeaker: {
		snapshot: async (input) => {
			const speakerId = readNumber(input, "id");
			const row =
				speakerId !== undefined
					? await db.query.speaker.findFirst({
							where: eq(speaker.id, speakerId),
							columns: { projectId: true },
						})
					: undefined;
			return {
				projectId: readString(input, "projectId") ?? row?.projectId,
				activityIds: await activityIdsForSpeaker(speakerId),
			};
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			return [
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				...readStringArray(snapshot, "activityIds").map(
					activityCacheTag,
				),
			];
		},
	},

	claimSpeakersForParticipant: {
		snapshot: async (input) => {
			const projectId = readString(input, "projectId");
			return {
				projectId,
				activityIds: await activityIdsForSpeakerProject(projectId),
			};
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			return [
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				...readStringArray(snapshot, "activityIds").map(
					activityCacheTag,
				),
			];
		},
	},

	// ── forms ────────────────────────────────────────────────────────
	createVersion: {
		tags: ({ input }) => {
			// Clonagem remapeia links do layout de perfil.
			const projectId = readString(input, "projectId");
			const clones = readString(input, "cloneFromVersionId");
			return clones && projectId
				? [
						profileLayoutCacheTag(projectId),
						projectProfilesCacheTag(projectId),
					]
				: [];
		},
	},

	upsertField: {
		snapshot: async (input) => {
			const version = await versionById(readString(input, "versionId"));
			return {
				projectId: version?.projectId,
				activityId: version?.activityId,
				isPublished: version?.isPublished,
			};
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			return [
				// `upsertField` pode remover links do layout / limpar flags.
				projectId ? profileLayoutCacheTag(projectId) : undefined,
				projectId ? projectProfilesCacheTag(projectId) : undefined,
				...publishedFormTags({
					projectId,
					activityId: readString(snapshot, "activityId"),
					isPublished: Boolean(record(snapshot).isPublished),
				}),
			];
		},
	},

	deleteField: {
		snapshot: async (input) => {
			const fieldId = readString(input, "fieldId");
			const field = fieldId
				? await db.query.formField.findFirst({
						where: eq(formField.id, fieldId),
						columns: { projectId: true, formVersionId: true },
					})
				: undefined;
			const version = await versionById(field?.formVersionId);
			return {
				projectId: field?.projectId ?? version?.projectId,
				activityId: version?.activityId,
				isPublished: version?.isPublished,
			};
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			return [
				projectId ? profileLayoutCacheTag(projectId) : undefined,
				projectId ? projectProfilesCacheTag(projectId) : undefined,
				...publishedFormTags({
					projectId,
					activityId: readString(snapshot, "activityId"),
					isPublished: Boolean(record(snapshot).isPublished),
				}),
			];
		},
	},

	reorderFields: {
		snapshot: async (input) => {
			const version = await versionById(readString(input, "versionId"));
			return {
				projectId: version?.projectId,
				activityId: version?.activityId,
				isPublished: version?.isPublished,
			};
		},
		tags: ({ snapshot }) =>
			publishedFormTags({
				projectId: readString(snapshot, "projectId"),
				activityId: readString(snapshot, "activityId"),
				isPublished: Boolean(record(snapshot).isPublished),
			}),
	},

	upsertSection: {
		snapshot: async (input) => {
			const version = await versionById(readString(input, "versionId"));
			return {
				projectId: version?.projectId,
				activityId: version?.activityId,
				isPublished: version?.isPublished,
			};
		},
		tags: ({ snapshot }) =>
			publishedFormTags({
				projectId: readString(snapshot, "projectId"),
				activityId: readString(snapshot, "activityId"),
				isPublished: Boolean(record(snapshot).isPublished),
			}),
	},

	deleteSection: {
		snapshot: async (input) => {
			const sectionId = readString(input, "sectionId");
			const section = sectionId
				? await db.query.formSection.findFirst({
						where: eq(formSection.id, sectionId),
						columns: { projectId: true, formVersionId: true },
					})
				: undefined;
			const version = await versionById(section?.formVersionId);
			return {
				projectId: section?.projectId ?? version?.projectId,
				activityId: version?.activityId,
				isPublished: version?.isPublished,
			};
		},
		tags: ({ snapshot }) =>
			publishedFormTags({
				projectId: readString(snapshot, "projectId"),
				activityId: readString(snapshot, "activityId"),
				isPublished: Boolean(record(snapshot).isPublished),
			}),
	},

	reorderSections: {
		snapshot: async (input) => {
			const version = await versionById(readString(input, "versionId"));
			return {
				projectId: version?.projectId,
				activityId: version?.activityId,
				isPublished: version?.isPublished,
			};
		},
		tags: ({ snapshot }) =>
			publishedFormTags({
				projectId: readString(snapshot, "projectId"),
				activityId: readString(snapshot, "activityId"),
				isPublished: Boolean(record(snapshot).isPublished),
			}),
	},

	publishVersion: {
		snapshot: async (input) => {
			const version = await versionById(readString(input, "versionId"));
			return {
				projectId: version?.projectId,
				activityId: version?.activityId,
			};
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			const activityId = readString(snapshot, "activityId");
			if (!projectId) return [];
			return activityId
				? [
						activityCacheTag(activityId),
						projectActivitiesCacheTag(projectId),
					]
				: [projectFormCacheTag(projectId)];
		},
	},

	unpublishVersion: {
		snapshot: async (input) => {
			const version = await versionById(readString(input, "versionId"));
			return {
				projectId: version?.projectId,
				activityId: version?.activityId,
			};
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			const activityId = readString(snapshot, "activityId");
			if (!projectId) return [];
			return activityId
				? [
						activityCacheTag(activityId),
						projectActivitiesCacheTag(projectId),
					]
				: [projectFormCacheTag(projectId)];
		},
	},

	deleteVersion: {
		snapshot: async (input) => {
			const version = await versionById(readString(input, "versionId"));
			return {
				projectId: version?.projectId,
				activityId: version?.activityId,
				isPublished: version?.isPublished,
			};
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			if (!projectId) return [];
			return [
				profileLayoutCacheTag(projectId),
				projectProfilesCacheTag(projectId),
				...publishedFormTags({
					projectId,
					activityId: readString(snapshot, "activityId"),
					isPublished: Boolean(record(snapshot).isPublished),
				}),
			];
		},
	},

	getOrCreateEditableActivityForm: {
		snapshot: async (input) => {
			// Só afeta o perfil público quando clona (remapeia links do layout).
			if (!record(input).cloneIfPublished) return undefined;
			return {
				projectId: await activityProjectId(
					readString(input, "activityId"),
				),
			};
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			return projectId
				? [
						profileLayoutCacheTag(projectId),
						projectProfilesCacheTag(projectId),
					]
				: [];
		},
	},

	submitAnswers: {
		tags: ({ input, result }) => {
			const projectId = readString(input, "projectId");
			// A inscrição só muda a programação quando vincula um palestrante
			// pré-cadastrado (`speaker.participantId`): aí a lista e as
			// atividades daquele palestrante passam a expor o vínculo.
			const claimedActivityIds = readStringArray(
				result,
				"claimedSpeakerActivityIds",
			);
			// O nome só invalida quando o UPDATE condicional devolveu linha.
			// Aí, apenas os perfis do próprio usuário e suas landings.
			const nameChanged = record(result).nameChanged === true;
			return [
				...(nameChanged
					? readProfileRefs(result, "profileRefs").map(
							({ projectId, shortId }) =>
								participantProfileCacheTag(projectId, shortId),
						)
					: []),
				...(nameChanged
					? readStringArray(result, "ownedProjectIds").map(
							projectCacheTag,
						)
					: []),
				projectId && claimedActivityIds.length > 0
					? projectActivitiesCacheTag(projectId)
					: undefined,
				...claimedActivityIds.map(activityCacheTag),
				// A inscrição concede pontos de boas-vindas.
				projectId ? projectGamificationCacheTag(projectId) : undefined,
			];
		},
	},

	updateMyAnswers: {
		snapshot: async (input, ctx) => {
			const projectId = readString(input, "projectId");
			const row = await participantRowsByProjectUser(
				projectId,
				sessionUserId(ctx),
			);
			return { projectId, shortId: row?.shortId };
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			const shortId = readString(snapshot, "shortId");
			return [
				projectId && shortId
					? participantProfileCacheTag(projectId, shortId)
					: undefined,
			];
		},
	},

	// ── profiles ─────────────────────────────────────────────────────
	updateProfileLayout: {
		tags: ({ input }) => {
			const projectId = readString(input, "projectId");
			return [
				projectId ? profileLayoutCacheTag(projectId) : undefined,
				projectId ? projectProfilesCacheTag(projectId) : undefined,
			];
		},
	},

	setFieldVisibility: {
		snapshot: async (input, ctx) => {
			const projectId = await projectIdByUrl(
				readString(input, "projectUrl"),
			);
			const row = await participantRowsByProjectUser(
				projectId,
				sessionUserId(ctx),
			);
			return { projectId, shortId: row?.shortId };
		},
		tags: ({ snapshot }) => {
			const projectId = readString(snapshot, "projectId");
			const shortId = readString(snapshot, "shortId");
			return [
				projectId && shortId
					? participantProfileCacheTag(projectId, shortId)
					: undefined,
			];
		},
	},

	recordProfileVisit: {
		// Mutation pública, para a visita sair numa só chamada. O input já
		// traz o id do projeto, então não há snapshot.
		//
		// `recorded` continua true para visitas aceitas (o cliente usa isso
		// para o dedupe de 10 min); `created` só é true quando a PK
		// (viewer, viewed) realmente inseriu uma conexão. Visita repetida não
		// muda o perfil visitado e não deve regenerar o ISR.
		tags: ({ input, result }) => {
			if (!record(result).created) return [];
			const projectId = readString(input, "projectId");
			const shortId = readString(input, "shortId");
			return [
				projectId && shortId
					? participantProfileCacheTag(projectId, shortId)
					: undefined,
				// Conexões novas podem liberar o adesivo Conector.
				projectId ? projectGamificationCacheTag(projectId) : undefined,
			];
		},
	},
};

// ────────────────────────────── revalidação ──────────────────────────────

type CacheRevalidator = (tag: string) => void;

let revalidator: CacheRevalidator | null = null;

/**
 * O app (Next) registra `revalidateTag(tag, "max")` aqui. O import de
 * `next/cache` fica FORA de `packages/api`: o pacote tem um `next` próprio
 * (devDependency) e a instância de `next/cache` precisa ser a que está
 * executando o servidor (stores em AsyncLocalStorage).
 *
 * O registro vive em `apps/web/lib/server-cache-invalidation.ts` (módulo
 * server-only com efeito de import), importado por **todo** runtime que
 * executa mutations: handler tRPC, handler `/api/auth/*` e o caller de
 * servidor. Assim a invalidação não depende de um único route module.
 */
export function registerCacheRevalidator(next: CacheRevalidator) {
	revalidator = next;
}

/** Só para testes: volta o registro ao estado "sem revalidator". */
export function __unregisterCacheRevalidator() {
	revalidator = null;
}

let warnedMissingRevalidator = false;

/**
 * Falha alto quando uma mutation COM regra roda sem revalidator: em dev é
 * um `console.error` (uma vez por processo); com
 * `CACHE_INVALIDATION_STRICT=1` é `throw` (diagnóstico/CI). Em teste o
 * aviso é silencioso para não poluir a suíte — os testes registram o seu
 * próprio revalidator quando querem observar as tags.
 */
function reportMissingRevalidator(tags: readonly string[]) {
	const detail = tags.join(", ");

	if (process.env.CACHE_INVALIDATION_STRICT === "1") {
		throw new Error(
			`[cache] mutation pediu invalidação sem revalidator registrado: ${detail}. ` +
				`Importe "@/lib/server-cache-invalidation" no runtime que executa a mutation.`,
		);
	}

	if (process.env.NODE_ENV === "production" || warnedMissingRevalidator) {
		return;
	}
	if (process.env.NODE_ENV === "test") return;

	warnedMissingRevalidator = true;
	console.error(
		`[cache] invalidação pedida sem revalidator registrado (${tags.length} tag(s)): ${detail}. ` +
			`Importe "@/lib/server-cache-invalidation" no runtime que executa a mutation.`,
	);
}

/** Deduplica e dispara a invalidação; nunca deve derrubar a mutation. */
export function invalidateCacheTags(
	tags: readonly (string | undefined | false)[],
) {
	const list = [...new Set(tags)].filter((tag): tag is string =>
		Boolean(tag),
	);

	if (list.length === 0) return;

	if (!revalidator) {
		reportMissingRevalidator(list);
		return;
	}

	for (const tag of list) {
		try {
			revalidator(tag);
		} catch {
			// Contexto sem cache (ex.: vitest/CLI) — segue sem invalidar.
		}
	}
}

/**
 * Escrita de identidade do usuário fora do tRPC (better-auth:
 * `update-user`/`change-email`/exclusão). Mesmas tags da regra `updateUser`:
 * o nome/avatar aparece no evento (dono) e nos perfis públicos.
 *
 * Sem `userId`, na exclusão (os perfis já sumiram do banco) ou se a busca
 * das tags do usuário falhar, derruba `events`/`profiles` inteiros.
 *
 * Chamado pelo ouvinte registrado em `@/lib/server-cache-invalidation`
 * (ver `onAuthUserChanged` em `@verific/auth`).
 */
export async function invalidateAuthUserChange(
	change: { userId: string | null; reason: "update" | "delete" } = {
		userId: null,
		reason: "update",
	},
) {
	const invalidateAll = () =>
		invalidateCacheTags([
			GLOBAL_CACHE_TAGS.events,
			GLOBAL_CACHE_TAGS.profiles,
		]);
	if (!change.userId || change.reason === "delete") {
		invalidateAll();
		return;
	}

	let profileRefs, ownedProjectIds;
	try {
		[profileRefs, ownedProjectIds] = await Promise.all([
			userProfileRefs(change.userId),
			userOwnedProjectIds(change.userId),
		]);
	} catch {
		invalidateAll();
		return;
	}
	invalidateCacheTags([
		...profileRefs.map(({ projectId, shortId }) =>
			participantProfileCacheTag(projectId, shortId),
		),
		...ownedProjectIds.map(projectCacheTag),
	]);
}
