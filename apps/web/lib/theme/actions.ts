"use server";

import { updateTag } from "next/cache";

import { projectUrlCacheTag } from "@verific/api";
import { hasProjectAccessByUrl } from "@verific/api/project-access";

import { getSession } from "@/lib/session";

/**
 * Revalida as páginas estáticas afetadas após salvar o tema
 * (o editor usa `trpc.updateProject` no cliente, como os outros
 * formulários de configurações, e chama esta action em seguida).
 *
 * `project-url:<url>` cobre `getProject`/metadados/`getProfileLayout` do
 * evento. O middleware do tRPC já invalidou `project:<id>` via SWR — aqui
 * o `updateTag` garante leitura imediata para quem salvou.
 */
export async function revalidateProjectTheme(projectUrl: string) {
	const session = await getSession();
	if (
		!session ||
		!(await hasProjectAccessByUrl(projectUrl, session.user.id))
	) {
		return { revalidated: false };
	}
	updateTag(projectUrlCacheTag(projectUrl));
	return { revalidated: true };
}
