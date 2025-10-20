import { publicClient } from './trpc/server';
import { unstable_cache } from 'next/cache';

export const getProject = (projectUrl: string, userId?: string) => {
    return unstable_cache(
        async () => {
            const res = await publicClient.getProject({ url: projectUrl, userId });
            return res;
        }
        , [`project-${projectUrl}`], { revalidate: 3600 * 24 })();
}

export const getProjects = unstable_cache(
    async () => {
        const res = await publicClient.getAllProjects();
        return res;
    },
    ["projects"],
    { revalidate: 3600 * 24 }
);

export const getCachedActivities = unstable_cache(
    async (params: Parameters<typeof publicClient.getActivities>[0]) => {
        return await publicClient.getActivities(params);
    },
    ["activities"],
    { revalidate: 3600 * 24 }
);

export const getCachedActivitiesFromParticipant = (projectUrl: string, userId: string) => {
    return unstable_cache(
        async () => {
            return await publicClient.getActivitiesFromParticipant({ projectUrl, userId });
        },
        [`activities-from-participant-${userId}`],
        { revalidate: 3600 * 24 }
    )();
}

export const getCachedParticipants = unstable_cache(
    async (params: Parameters<typeof publicClient.getParticipants>[0]) => {
        return await publicClient.getParticipants(params);
    },
    ["participants"],
    { revalidate: 3600 * 24 }
);

export const getCachedCheckParticipantEnrollment = (projectUrl: string, userId: string) => {
    return unstable_cache(
        async () => {
            const res = await publicClient.checkParticipant({ projectUrl, userId });
            return res;
        },
        [`participant-enrollment-${userId}`],
        { revalidate: 3600 * 24 }
    )();
}