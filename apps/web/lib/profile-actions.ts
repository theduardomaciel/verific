"use server";

import { updateTag } from "next/cache";

/** Revalida o perfil estático após edição (perfil, privacidade, tema). */
export async function revalidateProfile(projectUrl: string, shortId: string) {
	updateTag(`profiles-${projectUrl}`);
	updateTag(`profile-${projectUrl}-${shortId}`);
	return { revalidated: true };
}
