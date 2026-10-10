import { cacheLife, cacheTag } from "next/cache";

import { isAfterEnd } from "@/lib/date";
import { createClientForUser, publicClient } from "@/lib/trpc/server";

export async function getProject(projectUrl: string) {
	"use cache";
	cacheLife("hours");
	cacheTag("projects", `project:${projectUrl}`);

	try {
		return await publicClient.getProject({ url: projectUrl });
	} catch {
		return null;
	}
}

export async function getProjects() {
	"use cache";
	cacheLife("hours");
	cacheTag("projects");
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
	const events = await getEventStaticParams();

	if (events.length === 1 && events[0]?.eventUrl === "__no-events__") {
		return [];
	}

	const perEvent = await Promise.all(
		events.map(async ({ eventUrl }) => {
			const { activities } = await getCachedActivities({
				projectUrl: eventUrl,
				pageSize: 1000,
			});

			return activities.map((activity) => ({
				eventUrl,
				activityId: activity.id,
			}));
		}),
	);

	return perEvent.flat();
}

/**
 * Decisão "inscrições abertas?" a partir dos dados do evento.
 * A leitura do relógio (`isAfterEnd`) vive dentro de "use cache":
 * o valor é congelado pelo tempo do cache (revalidado em minutos)
 * em vez de quebrar o prerender estático.
 */
export async function getEventRegistration(projectUrl: string) {
	"use cache";
	cacheLife("minutes");
	cacheTag("projects", `project:${projectUrl}`);

	const result = await getProject(projectUrl);
	const project = result?.project;
	if (!project) return null;

	const isOpen =
		Boolean(project.isRegistrationEnabled) &&
		!project.isArchived &&
		!isAfterEnd(new Date(project.endDate));

	return {
		isOpen,
		isRegistrationEnabled: Boolean(project.isRegistrationEnabled),
		isArchived: Boolean(project.isArchived),
	};
}

export async function getCachedActivities(
	params: Parameters<typeof publicClient.getActivities>[0],
) {
	"use cache";
	cacheLife("minutes");
	cacheTag(
		"activities",
		`activities:${params.projectId ?? params.projectUrl ?? "all"}`,
	);
	return await publicClient.getActivities(params);
}

export async function getCachedActivity(
	params: Parameters<typeof publicClient.getActivity>[0],
) {
	"use cache";
	cacheLife("minutes");
	cacheTag("activities", `activity:${params.activityId}`);
	return publicClient.getActivity(params);
}

export async function getCachedActivitiesFromParticipant(
	projectUrl: string,
	userId: string,
) {
	"use cache";
	cacheLife({ stale: 30, revalidate: 30, expire: 60 });
	cacheTag(
		`activities-from-participant-${userId}`,
		`activities-from-participant-${userId}-${projectUrl}`,
	);
	return createClientForUser(userId).getActivitiesFromParticipant({
		projectUrl,
	});
}

export async function getCachedParticipants(
	userId: string,
	params: Parameters<typeof publicClient.getParticipants>[0],
) {
	"use cache";
	cacheLife("hours");
	cacheTag("participants", `participants:${params.projectId ?? "all"}`);
	return createClientForUser(userId).getParticipants(params);
}

export async function getCachedCheckParticipantEnrollment(
	projectUrl: string,
	userId: string,
) {
	"use cache";
	cacheLife({ stale: 30, revalidate: 30, expire: 60 });
	cacheTag(
		`participant-enrollment-${userId}`,
		`participant-enrollment-${userId}-${projectUrl}`,
	);
	return createClientForUser(userId).checkParticipant({ projectUrl });
}

export async function getCachedSubscribedActivitiesIdsFromParticipant(
	projectUrl: string,
	userId: string,
) {
	"use cache";
	cacheLife({ stale: 30, revalidate: 30, expire: 60 });
	cacheTag(
		`subscribed-activities-ids-from-participant-${userId}`,
		`subscribed-activities-ids-from-participant-${userId}-${projectUrl}`,
	);
	return createClientForUser(
		userId,
	).getSubscribedActivitiesIdsFromParticipant({
		projectUrl,
	});
}

export async function getCachedUser(userId: string) {
	"use cache";
	cacheLife("minutes");
	cacheTag("users", `user:${userId}`);
	return createClientForUser(userId).getUser();
}

export async function getProfilePageData(projectUrl: string, shortId: string) {
	"use cache";
	cacheLife("minutes");
	cacheTag(`profiles-${projectUrl}`, `profile-${projectUrl}-${shortId}`);
	return publicClient.getProfilePageData({ projectUrl, shortId });
}
