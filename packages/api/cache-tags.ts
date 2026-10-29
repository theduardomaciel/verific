/**
 * Vocabulário único de cache tags (Next `cacheComponents`) do verifIC.
 *
 * Convenções:
 * - Toda tag nasce de um helper daqui; nenhum literal solto pelo app.
 * - Escopo por **id** (nunca por URL) sempre que conhecido: permite
 *   invalidação fina — mutação de um evento não derruba o cache de outro.
 * - A URL entra como tag **adicional** apenas nas entradas chaveadas por
 *   URL (`getProject(url)`, `getProfileLayout(url)`), para que trocar o
 *   slug invalide a entrada antiga **e** a nova.
 * - Guarda-chuvas (`events`, `profiles`): mudanças de identidade do usuário
 *   (nome/avatar) refletem em qualquer página pública — invalidadas só em
 *   mutações raras de conta.
 *
 * Este módulo é puro (só strings): pode ser importado tanto pelo servidor
 * tRPC (`@verific/api`) quanto pela camada de dados do app.
 */

export const GLOBAL_CACHE_TAGS = {
	/** Lista pública de eventos (`getAllProjects`), usada em `generateStaticParams`. */
	projects: "projects",
	/** Guarda-chuva: qualquer entrada pública que embute dados de projeto (ex.: nome do dono). */
	events: "events",
	/** Guarda-chuva: qualquer perfil público (nome/avatar do usuário). */
	profiles: "profiles",
} as const;

/** Dados do evento em si (`getProject`). */
export function projectCacheTag(projectId: string) {
	return `project:${projectId}`;
}

/** Entradas chaveadas por slug de evento (`getProject(url)`, `getProfileLayout(url)`). */
export function projectUrlCacheTag(projectUrl: string) {
	return `project-url:${projectUrl}`;
}

/** Lista de atividades do evento (`getActivities`). */
export function projectActivitiesCacheTag(projectId: string) {
	return `project-activities:${projectId}`;
}

/** Guarda-chuva dos perfis de um evento (`getProfilePageData`). */
export function projectProfilesCacheTag(projectId: string) {
	return `project-profiles:${projectId}`;
}

/** Formulário publicado do evento (`getPublishedForm` sem `activityId`). */
export function projectFormCacheTag(projectId: string) {
	return `project-form:${projectId}`;
}

/** Layout do perfil do evento (`getProfileLayout`). */
export function profileLayoutCacheTag(projectId: string) {
	return `profile-layout:${projectId}`;
}

/** Detalhe de uma atividade (`getActivity`). */
export function activityCacheTag(activityId: string) {
	return `activity:${activityId}`;
}

/** Disponibilidade pública de vagas (`getActivityAvailability`). */
export function activityAvailabilityCacheTag(activityId: string) {
	return `activity-availability:${activityId}`;
}

/** Perfil público de um participante (`getProfilePageData`). */
export function participantProfileCacheTag(projectId: string, shortId: string) {
	return `participant-profile:${projectId}:${shortId}`;
}

/**
 * Ranking público e snapshot de gamificação do evento (`getEventRanking`,
 * `getParticipantGamification`).
 *
 * Uma tag por evento (e não por participante) é intencional: qualquer
 * check-in/ponto muda a ordem do ranking, então a invalidação fina não
 * compensaria o custo de manter duas listas de tags.
 */
export function projectGamificationCacheTag(projectId: string) {
	return `project-gamification:${projectId}`;
}

/**
 * Consultas públicas cujo resultado **não depende da sessão** — elegíveis a
 * `Cache-Control` público no handler HTTP do tRPC (edge cache). Qualquer
 * caminho fora desta lista mantém a resposta privada.
 *
 * Os nomes são os caminhos **reais** do tRPC (planos, sem prefixo de
 * router): `appRouter` é um `mergeRouters` de routers planos, então o
 * caminho é `getProject`, não `projects.getProject`. Um nome errado aqui
 * simplesmente nunca casa — silêncio, não erro.
 *
 * Ficam de fora, de propósito:
 * - `getActivity`: devolve campos que dependem de `ctx.session` (e-mail dos
 *   inscritos para organizadores).
 * - `getActivities`: com `fullQuery` exige organizador e lê a sessão.
 * - `getEventRanking`: quando o ranking não é público, a resposta depende da
 *   sessão (só membros do evento veem).
 */
export const PUBLIC_CACHEABLE_QUERY_PATHS: ReadonlySet<string> = new Set([
	"getActivityAvailability",
	"getAllProjects",
	"getProject",
	"getProfilePageData",
	"getProfileConnections",
	"getProfileLayout",
	"getPublishedForm",
	"getProjectTags",
]);
