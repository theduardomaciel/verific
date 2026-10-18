"use server";

import { refresh, updateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { projectUrlCacheTag } from "@verific/api";
import { auth } from "@verific/auth";

export async function loginAction(callbackUrl: string) {
	const safeCallbackUrl = callbackUrl.startsWith("/")
		? callbackUrl
		: "/account";
	const result = await auth.api.signInSocial({
		body: {
			provider: "google",
			callbackURL: safeCallbackUrl,
			// Reforça o seletor de contas por requisição (o padrão do
			// provider já define `prompt: "select_account"`).
			additionalParams: { prompt: "select_account" },
		},
		headers: await headers(),
	});

	redirect(result.url ?? safeCallbackUrl);
}

export async function signOutAction(redirectTo: string = "/") {
	await auth.api.signOut({
		headers: await headers(),
	});
	redirect(redirectTo);
}

export async function signOutFormAction(formData: FormData) {
	const redirectTo = (formData.get("redirectTo") as string) || "/";
	await auth.api.signOut({
		headers: await headers(),
	});
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
 * Ações chamadas por componentes de cliente DEPOIS de mutations tRPC.
 *
 * O cache do servidor já é invalidado no middleware do tRPC (registro
 * declarativo em `@verific/api/cache-invalidation`), que roda no handler
 * HTTP de todas as mutations. O que faltava era o roteador do cliente:
 * `refresh()` marca o cache de router como stale para a próxima
 * renderização buscar o RSC novo — sem `revalidateTag` (que apagaria o
 * cache de router inteiro, de graça, a cada chamada).
 *
 * Os nomes antigos seguem exportados porque os componentes (e seus
 * testes) os importam; o corpo virou no-op de servidor.
 */
export async function revalidateActivities() {
	refresh();
}

export async function revalidateParticipants() {
	refresh();
}

export async function revalidateParticipantActivities(_userId: string) {
	refresh();
}

export async function revalidateParticipantEnrollment(_userId: string) {
	refresh();
}

export async function revalidateSubscribedActivitiesIdsFromParticipant(
	_userId: string,
) {
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
	updateTag(projectUrlCacheTag(projectUrl));
}
