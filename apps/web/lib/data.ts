import { cache } from 'react'
import { serverClient } from './trpc/server';

export const getProject = cache(async (url: string) => {
    const res = await serverClient.getProject({ url });
    return res
})