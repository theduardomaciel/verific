import { cache } from 'react'
import { publicClient, serverClient } from './trpc/server';

export const getProject = cache(async (url: string) => {
    const res = await serverClient.getProject({ url });
    return res
})

export const getProjects = cache(async () => {
    const res = await publicClient.getAllProjects();
    return res
})