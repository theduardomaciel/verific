"use server";

import { updateTag } from "next/cache";

import { GLOBAL_CACHE_TAGS, projectUrlCacheTag } from "@verific/api";

/**
 * Revalida as páginas estáticas afetadas após salvar o tema
 * (o editor usa `trpc.updateProject` no cliente, como os outros
 * formulários de configurações, e chama esta action em seguida).
 *
 * `project-url:<url>` cobre `getProject`/metadados/`getProfileLayout` do
 * evento; `projects` cobre a lista pública (cards da landing embutem o
 * tema). O middleware do tRPC já invalidou `project:<id>` via SWR — aqui
 * o `updateTag` garante leitura imediata para quem salvou.
 */
export async function revalidateProjectTheme(projectUrl: string) {
	updateTag(projectUrlCacheTag(projectUrl));
	updateTag(GLOBAL_CACHE_TAGS.projects);
	return { revalidated: true };
}
