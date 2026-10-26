"use server";

import { refresh, updateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { projectUrlCacheTag } from "@verific/api";
import { hasProjectAccessByUrl } from "@verific/api/project-access";
import { auth } from "@verific/auth";

import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSession } from "@/lib/session";
import { SESSION_MARKER_COOKIE } from "@/lib/session-marker";

export async function signOutAction(redirectTo: string = "/") {
	await auth.api.signOut({
		headers: await headers(),
	});
	(await cookies()).delete(SESSION_MARKER_COOKIE);
	redirect(safeRedirectPath(redirectTo, "/"));
}

export async function signOutFormAction(formData: FormData) {
	const redirectTo = safeRedirectPath(formData.get("redirectTo"), "/");
	await auth.api.signOut({
		headers: await headers(),
	});
	(await cookies()).delete(SESSION_MARKER_COOKIE);
	redirect(redirectTo);
}

export async function updateProjectCookies(projectId: string) {
	const cookieStore = await cookies();
	cookieStore.set("projectId", projectId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
	});

	redirect("/dashboard");
}

/**
 * Chamada por componentes de cliente depois de uma mutation tRPC, uma vez
 * por fluxo (cada chamada é uma invocação). O cache do servidor já foi
 * invalidado pelo middleware do tRPC; `refresh()` marca o cache de router
 * do cliente como velho para a próxima renderização buscar o RSC novo.
 */
export async function refreshRoute() {
	refresh();
}

/**
 * Invalida o cache do evento recém-criado (inclui o `null` cacheado de
 * visitas anteriores à criação). `updateTag` (imediato, só em Server
 * Action) garante que o próprio criador não leve o 404 defasado ao abrir
 * a página nova; as demais leituras do evento seguem a invalidação por
 * tag do middleware tRPC.
 */
export async function revalidateProjects(projectUrl: string) {
	const session = await getSession();
	if (
		!session ||
		!(await hasProjectAccessByUrl(projectUrl, session.user.id))
	) {
		return;
	}
	updateTag(projectUrlCacheTag(projectUrl));
}
