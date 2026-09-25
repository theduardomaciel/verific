import { cacheLife, cacheTag } from "next/cache";

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

export async function getCachedActivities(
	params: Parameters<typeof publicClient.getActivities>[0],
) {
	"use cache";
	cacheLife("minutes");
	cacheTag(
		"activities",
		`activities:${params.projectId ?? params.projectUrl ?? "all"}`,
	);
	return publicClient.getActivities(params);
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
