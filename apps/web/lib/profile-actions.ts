"use server";

import { updateTag } from "next/cache";

import {
	participantProfileCacheTag,
	profileLayoutCacheTag,
	projectProfilesCacheTag,
} from "@verific/api";
import {
	hasProjectAccess,
	ownsParticipantProfile,
} from "@verific/api/project-access";

import { getSession } from "@/lib/session";

/**
 * Revalida o perfil público após edição (perfil, privacidade, tema).
 * `updateTag` é imediato (read-your-own-writes): quem editou não pode
 * levar a versão antiga do próprio perfil ao fechar o diálogo — a
 * invalidação SWR do middleware tRPC sozinha serviria o stale uma vez.
 */
export async function revalidateProfile(projectId: string, shortId: string) {
	const session = await getSession();
	const allowed =
		session &&
		((await ownsParticipantProfile(projectId, shortId, session.user.id)) ||
			(await hasProjectAccess(projectId, session.user.id)));
	if (!allowed) return { revalidated: false };
	updateTag(participantProfileCacheTag(projectId, shortId));
	return { revalidated: true };
}

/** Revalida todos os perfis do evento após salvar o layout. */
export async function revalidateEventProfiles(projectId: string) {
	const session = await getSession();
	if (!session || !(await hasProjectAccess(projectId, session.user.id))) {
		return { revalidated: false };
	}
	updateTag(profileLayoutCacheTag(projectId));
	updateTag(projectProfilesCacheTag(projectId));
	return { revalidated: true };
}
