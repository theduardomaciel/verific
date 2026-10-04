"use server";

import { updateTag } from "next/cache";

/**
 * Revalida as páginas estáticas afetadas após salvar o tema
 * (o editor usa `trpc.updateProject` no cliente, como os outros
 * formulários de configurações, e chama esta action em seguida).
 */
export async function revalidateProjectTheme(projectUrl: string) {
	updateTag("projects");
	updateTag(`project:${projectUrl}`);
	return { revalidated: true };
}
