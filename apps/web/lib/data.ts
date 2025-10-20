import { publicClient } from './trpc/server';
import { unstable_cache } from 'next/cache';

export const getProject = (projectUrl: string, userId?: string) => {
    return unstable_cache(
        async () => {
            const res = await publicClient.getProject({ url: projectUrl, userId });
            return res;
        },
        [`project-${projectUrl}`],
        { revalidate: 3600 * 24, tags: [`project-${projectUrl}`] }
    )();
}

export const getProjects = unstable_cache(
    async () => {
        const res = await publicClient.getAllProjects();
        return res;
    },
    ["projects"],
    { revalidate: 3600 * 24, tags: ["projects"] }
);

export const getCachedActivities = unstable_cache(
    async (params: Parameters<typeof publicClient.getActivities>[0]) => {
        return await publicClient.getActivities(params);
    },
    ["activities"],
    { revalidate: 3600 * 24, tags: ["activities"] }
);

export const getCachedActivitiesFromParticipant = (projectUrl: string, userId: string) => {
    return unstable_cache(
        async () => {
            return await publicClient.getActivitiesFromParticipant({ projectUrl, userId });
        },
        [`activities-from-participant-${userId}`],
        { revalidate: 3600 * 24, tags: [`activities-from-participant-${userId}`] }
    )();
}

export const getCachedParticipants = unstable_cache(
    async (params: Parameters<typeof publicClient.getParticipants>[0]) => {
        return await publicClient.getParticipants(params);
    },
    ["participants"],
    { revalidate: 3600 * 24, tags: ["participants"] }
);

export const getCachedCheckParticipantEnrollment = (projectUrl: string, userId: string) => {
    return unstable_cache(
        async () => {
            const res = await publicClient.checkParticipant({ projectUrl, userId });
            return res;
        },
        [`participant-enrollment-${userId}`],
        { revalidate: 60, tags: [`participant-enrollment-${userId}`] }
    )();
}

export const getCachedSubscribedActivitiesIdsFromParticipant = (userId: string) => {
    return unstable_cache(
        async () => {
            const res = await publicClient.getSubscribedActivitiesIdsFromParticipant({ userId });
            return res;
        },
        [`subscribed-activities-ids-from-participant-${userId}`],
        { revalidate: 300, tags: [`subscribed-activities-ids-from-participant-${userId}`] }
    )();
}