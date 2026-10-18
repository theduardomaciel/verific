import { db } from "@verific/drizzle";
import { and, eq } from "@verific/drizzle/orm";
import {
	activity,
	activitySession,
	formField,
	formSection,
	formVersion,
	participant,
	participantOnActivity,
	project,
	speaker,
	speakerOnActivity,
	tag,
	tagOnActivity,
} from "@verific/drizzle/schema";

import {
	activityCacheTag,
	GLOBAL_CACHE_TAGS,
	participantProfileCacheTag,
	profileLayoutCacheTag,
	projectActivitiesCacheTag,
	projectCacheTag,
	projectFormCacheTag,
	projectProfilesCacheTag,
	projectUrlCacheTag,
} from "./cache-tags";

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
 * recebe a versão antiga e a regeneração acontece em background. Nada é
 * regenerado "em massa" junto da mutação (era isso que estourava o
 * orçamento de CPU).
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

async function activityIdsForParticipant(participantId: string | undefined) {
	if (!participantId) return [];
	const rows = await db.query.participantOnActivity.findMany({
		where: eq(participantOnActivity.participantId, participantId),
		columns: { activityId: true },
	});
	return rows.map((row) => row.activityId);
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
	return {
		projectId: await activityProjectId(readString(input, "activityId")),
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
		tags: ({ input, snapshot }) => {
			const id = readString(input, "id");
			const nextUrl = readString(input, "url");
			const previousUrl = readString(snapshot, "previousUrl");
			return [
				GLOBAL_CACHE_TAGS.projects,
				id ? projectCacheTag(id) : undefined,
				previousUrl ? projectUrlCacheTag(previousUrl) : undefined,
				nextUrl && nextUrl !== previousUrl
					? projectUrlCacheTag(nextUrl)
					: undefined,
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
	// Nome do usuário aparece em páginas de evento (dono) e perfis públicos;
	// guarda-chuvas garantem a atualização nas próximas visitas.
	updateUser: {
		tags: () => [GLOBAL_CACHE_TAGS.events, GLOBAL_CACHE_TAGS.profiles],
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
			return [
				activityId ? activityCacheTag(activityId) : undefined,
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
			];
		},
	},

	updateActivityParticipants: {
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

	addActivityParticipants: {
		snapshot: snapshotActivityProject,
		tags: ({ input, snapshot }) => {
			const activityId = readString(input, "activityId");
			const projectId = readString(snapshot, "projectId");
			return [
				activityId ? activityCacheTag(activityId) : undefined,
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				// Pode gravar respostas em nome de participantes → perfis.
				projectId ? projectProfilesCacheTag(projectId) : undefined,
			];
		},
	},

	addMonitorsToActivity: {
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
		tags: ({ input, snapshot }) => {
			const activityId = readString(input, "activityId");
			const projectId = readString(snapshot, "projectId");
			const shortId = readString(snapshot, "shortId");
			return [
				activityId ? activityCacheTag(activityId) : undefined,
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				// Respostas da atividade podem aparecer no perfil público.
				projectId && shortId
					? participantProfileCacheTag(projectId, shortId)
					: undefined,
			];
		},
	},

	// ── participants ─────────────────────────────────────────────────
	updateSessionPresence: {
		snapshot: async (input) => {
			const sessionId = readString(input, "sessionId");
			if (!sessionId) return undefined;
			const session = await db.query.activitySession.findFirst({
				where: eq(activitySession.id, sessionId),
				columns: { activityId: true },
			});
			if (!session) return undefined;
			return {
				activityId: session.activityId,
				projectId: await activityProjectId(session.activityId),
			};
		},
		tags: ({ snapshot }) => {
			const activityId = readString(snapshot, "activityId");
			const projectId = readString(snapshot, "projectId");
			return [
				activityId ? activityCacheTag(activityId) : undefined,
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
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
				activityIds: await activityIdsForParticipant(participantId),
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
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				...readStringArray(snapshot, "activityIds").map(
					activityCacheTag,
				),
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
				activityIds: await activityIdsForParticipant(row?.id),
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
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				...readStringArray(snapshot, "activityIds").map(
					activityCacheTag,
				),
			];
		},
	},

	// ── waitlist ─────────────────────────────────────────────────────
	// Inscrição/desistência/promoção mudam contagem (inclusive assentos
	// "offered", contados em `participantsCount`) e podem gravar respostas.
	joinActivityWaitlist: {
		snapshot: snapshotActivityProject,
		tags: ({ input, snapshot }) => {
			const activityId = readString(input, "activityId");
			const projectId = readString(snapshot, "projectId");
			return [
				activityId ? activityCacheTag(activityId) : undefined,
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				projectId ? projectProfilesCacheTag(projectId) : undefined,
			];
		},
	},

	leaveActivityWaitlist: {
		snapshot: snapshotActivityProject,
		tags: ({ input, snapshot }) => {
			const activityId = readString(input, "activityId");
			const projectId = readString(snapshot, "projectId");
			return [
				activityId ? activityCacheTag(activityId) : undefined,
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				projectId ? projectProfilesCacheTag(projectId) : undefined,
			];
		},
	},

	confirmWaitlistOffer: {
		snapshot: snapshotActivityProject,
		tags: ({ input, snapshot }) => {
			const activityId = readString(input, "activityId");
			const projectId = readString(snapshot, "projectId");
			return [
				activityId ? activityCacheTag(activityId) : undefined,
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				projectId ? projectProfilesCacheTag(projectId) : undefined,
			];
		},
	},

	promoteFromWaitlist: {
		snapshot: snapshotActivityProject,
		tags: ({ input, snapshot }) => {
			const activityId = readString(input, "activityId");
			const projectId = readString(snapshot, "projectId");
			return [
				activityId ? activityCacheTag(activityId) : undefined,
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				projectId ? projectProfilesCacheTag(projectId) : undefined,
			];
		},
	},

	removeFromWaitlist: {
		snapshot: snapshotActivityProject,
		tags: ({ input, snapshot }) => {
			const activityId = readString(input, "activityId");
			const projectId = readString(snapshot, "projectId");
			return [
				activityId ? activityCacheTag(activityId) : undefined,
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				projectId ? projectProfilesCacheTag(projectId) : undefined,
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
			const shortId = readString(result, "shortId");
			return [
				projectId ? projectProfilesCacheTag(projectId) : undefined,
				projectId && shortId
					? participantProfileCacheTag(projectId, shortId)
					: undefined,
				// A inscrição pode vincular um palestrante pré-cadastrado
				// (`speaker.participantId`), e a programação expõe esse vínculo.
				projectId ? projectActivitiesCacheTag(projectId) : undefined,
				// O cadastro grava `user.name` (pode ser o primeiro valor).
				GLOBAL_CACHE_TAGS.profiles,
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
		snapshot: async (input) => ({
			projectId: await projectIdByUrl(readString(input, "projectUrl")),
		}),
		tags: ({ input, result, snapshot }) => {
			if (!record(result).recorded) return [];
			const projectId = readString(snapshot, "projectId");
			const shortId = readString(input, "shortId");
			return [
				projectId && shortId
					? participantProfileCacheTag(projectId, shortId)
					: undefined,
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
 * Chamado pelo ouvinte registrado em `@/lib/server-cache-invalidation`
 * (ver `onAuthUserChanged` em `@verific/auth`).
 */
export function invalidateAuthUserChange() {
	invalidateCacheTags([GLOBAL_CACHE_TAGS.events, GLOBAL_CACHE_TAGS.profiles]);
}
