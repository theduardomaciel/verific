import { cacheLife, cacheTag } from "next/cache";

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
} from "@verific/api";

import { isAfterEnd } from "@/lib/date";
import { publicClient } from "@/lib/trpc/server";

/**
 * Leituras públicas cacheadas ("use cache") do app.
 *
 * Perfil `static` (next.config.ts): `stale` 1h no roteador do cliente,
 * `revalidate` 24h como rede de segurança e `expire` de 7 dias. A
 * atualização normal vem de invalidação on-demand: as mutations do tRPC
 * chamam `revalidateTag(tag, "max")` (registro em `@verific/api`), e as
 * tags abaixo dizem exatamente qual entrada cada mutation derruba.
 *
 * Entradas cujas chaves não existem (slug varrido por bots, projeto
 * removido) usam um perfil curto inline: cachear o `null` por dias
 * prenderia o 404 mesmo após a criação do evento.
 */

/**
 * Diagnóstico opt-in: corpo de função `"use cache"` só executa em
 * cache miss/regeneração, então qualquer log aqui É um miss.
 * Ative com `LOG_CACHE_MISSES=1` (por instância do servidor).
 */
const LOG_CACHE_MISSES = process.env.LOG_CACHE_MISSES === "1";

function logCacheMiss(name: string, key?: string) {
	if (!LOG_CACHE_MISSES) return;
	console.log(`[cache-miss] ${name}${key ? ` ${key}` : ""}`);
}

export async function getProject(projectUrl: string) {
	"use cache";
	cacheTag(projectUrlCacheTag(projectUrl));

	try {
		const result = await publicClient.getProject({ url: projectUrl });

		// Tag por id além da URL: mutações de dados do evento (nome, tema,
		// dono) invalidam `project:<id>` sem depender do slug atual.
		if (result.project.id) cacheTag(projectCacheTag(result.project.id));
		cacheLife("static");
		logCacheMiss("getProject", projectUrl);
		return result;
	} catch {
		// Slug inexistente: `null` barato, mas com vida curta — uma varredura
		// de bots não pode prender o 404 depois que o evento for criado.
		cacheLife({ stale: 300, revalidate: 14400, expire: 28800 });
		logCacheMiss("getProject:null", projectUrl);
		return null;
	}
}

/**
 * Landing do evento: única entrada pública que renderiza `project.owner.name`
 * (e o e-mail do produtor). O guarda-chuva `events` fica restrito a esta
 * leitura; layout, metadata, schedule, detalhe, inscrição e perfil usam
 * `getProject`, que não carrega `events`.
 *
 * A entrada externa também precisa das tags de projeto: `getProject` é uma
 * entrada aninhada, e as tags dela não sobem para o cache desta função.
 */
export async function getEventLanding(projectUrl: string) {
	"use cache";
	cacheTag(GLOBAL_CACHE_TAGS.events, projectUrlCacheTag(projectUrl));

	const result = await getProject(projectUrl);

	if (result?.project.id) {
		cacheTag(projectCacheTag(result.project.id));
		cacheLife("static");
		logCacheMiss("getEventLanding", projectUrl);
	} else {
		cacheLife({ stale: 300, revalidate: 14400, expire: 28800 });
		logCacheMiss("getEventLanding:null", projectUrl);
	}

	return result;
}

export async function getProjects() {
	"use cache";
	cacheLife("static");
	cacheTag(GLOBAL_CACHE_TAGS.projects);
	logCacheMiss("getProjects");
	return publicClient.getAllProjects();
}

export async function getEventStaticParams() {
	const projects = await getProjects();

	if (projects.length > 0) {
		return projects.map((project) => ({ eventUrl: project.url }));
	}

	return [{ eventUrl: "__no-events__" }];
}

/**
 * Params completos (`eventUrl` + `activityId`) para pré-renderizar as
 * páginas de atividade (rota cheia e modal interceptado) como estáticas.
 * Sem eventos cadastrados (sentinela `__no-events__`) retorna `[]` e as
 * rotas seguem on-demand, como hoje.
 */
export async function getActivityStaticParams() {
	const projects = await getProjects();

	if (projects.length === 0) {
		return [];
	}

	const perEvent = await Promise.all(
		projects.map(async ({ id, url }) => {
			const { activities } = await getCachedActivities({
				projectId: id,
				pageSize: 1000,
			});

			return activities.map((activity) => ({
				eventUrl: url,
				activityId: activity.id,
			}));
		}),
	);

	return perEvent.flat();
}

/**
 * Decisão "inscrições abertas?" a partir dos dados do evento.
 * A leitura do relógio (`isAfterEnd`) vive dentro de "use cache": o valor
 * é congelado no cache e a invalidação normal vem das tags do projeto.
 *
 * Como o fim do evento é uma transição por *tempo*, a entrada aberta usa
 * `revalidate` calculado até `endDate` (teto de 6 dias): a regeneração de
 * fundo acontece logo depois do encerramento, em vez de polling por
 * minuto — sem prender "inscrições abertas" por 24h.
 */
export async function getEventRegistration(projectUrl: string) {
	"use cache";
	cacheTag(projectUrlCacheTag(projectUrl));

	const result = await getProject(projectUrl);
	const project = result?.project;
	if (!project) {
		cacheLife({ stale: 300, revalidate: 14400, expire: 28800 });
		logCacheMiss("getEventRegistration:null", projectUrl);
		return null;
	}

	cacheTag(projectCacheTag(project.id));

	const endDate = new Date(project.endDate);
	const secondsUntilEnd = Math.ceil((endDate.getTime() - Date.now()) / 1000);

	if (isAfterEnd(endDate)) {
		// Encerrado permanece encerrado até uma edição (tag do projeto).
		cacheLife("static");
	} else {
		cacheLife({
			stale: 300,
			revalidate: Math.min(Math.max(secondsUntilEnd, 60), 6 * 86400),
			expire: 604800,
		});
	}

	logCacheMiss("getEventRegistration", projectUrl);

	return {
		isOpen:
			Boolean(project.isRegistrationEnabled) &&
			!project.isArchived &&
			!isAfterEnd(endDate),
		isRegistrationEnabled: Boolean(project.isRegistrationEnabled),
		isArchived: Boolean(project.isArchived),
	};
}

export async function getCachedActivities(params: {
	projectId: string;
	pageSize?: number;
}) {
	"use cache";
	cacheLife("static");
	cacheTag(projectActivitiesCacheTag(params.projectId));
	logCacheMiss(
		"getCachedActivities",
		`${params.projectId}:${params.pageSize ?? "default"}`,
	);
	return await publicClient.getActivities(params);
}

export async function getCachedActivity(params: { activityId: string }) {
	"use cache";
	cacheTag(activityCacheTag(params.activityId));

	const data = await publicClient.getActivity(params);

	// Sem `project-activities`: o detalhe não deve ser regenerado quando a
	// lista muda. Mutations que alteram o conteúdo de uma atividade já
	// invalidam `activity:<id>`; criação/exclusão e mudanças de
	// palestrante/tag invalidam a lista (e, quando afetam o detalhe,
	// também as atividades específicas via snapshot).
	cacheLife("static");
	logCacheMiss("getCachedActivity", params.activityId);

	return data;
}

export async function getProfilePageData(projectUrl: string, shortId: string) {
	"use cache";
	cacheTag(GLOBAL_CACHE_TAGS.profiles, projectUrlCacheTag(projectUrl));

	const result = await getProject(projectUrl);
	if (!result?.project) {
		// Projeto inexistente: deixa o procedimento lançar NOT_FOUND (a
		// página converte em 404 e o erro não é cacheado), como antes.
		return publicClient.getProfilePageData({ projectUrl, shortId });
	}

	cacheTag(
		projectProfilesCacheTag(result.project.id),
		participantProfileCacheTag(result.project.id, shortId),
	);
	cacheLife("static");
	logCacheMiss("getProfilePageData", `${projectUrl}/${shortId}`);

	return publicClient.getProfilePageData({ projectUrl, shortId });
}

/** Formulário publicado do evento (escopo do evento, sem `activityId`). */
export async function getCachedPublishedForm(projectId: string) {
	"use cache";
	cacheLife("static");
	cacheTag(projectFormCacheTag(projectId));
	logCacheMiss("getCachedPublishedForm", projectId);
	return publicClient.getPublishedForm({ projectId });
}

export async function getCachedProfileLayout(projectUrl: string) {
	"use cache";
	cacheTag(projectUrlCacheTag(projectUrl));

	const result = await getProject(projectUrl);
	if (!result?.project) {
		cacheLife({ stale: 300, revalidate: 14400, expire: 28800 });
		logCacheMiss("getCachedProfileLayout:null", projectUrl);
		return null;
	}

	cacheTag(profileLayoutCacheTag(result.project.id));
	cacheLife("static");
	logCacheMiss("getCachedProfileLayout", projectUrl);

	return publicClient.getProfileLayout({ projectUrl });
}
