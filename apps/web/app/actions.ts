"use server";

import { refresh, updateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { projectUrlCacheTag } from "@verific/api";
import { auth } from "@verific/auth";

import { safeRedirectPath } from "@/lib/safe-redirect";
import { SESSION_MARKER_COOKIE } from "@/lib/session-marker";

// Vive mais que a sessão (7d, renovável): marcador expirado só custa um
// no-op; expirar antes da sessão impediria visitas legítimas no evento.
const SESSION_MARKER_MAX_AGE = 60 * 60 * 24 * 30;

function sessionMarkerOptions() {
	return {
		httpOnly: false,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax" as const,
		path: "/",
		maxAge: SESSION_MARKER_MAX_AGE,
	};
}

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

	// Marcador otimista: se o usuário desistir no Google ele fica sem
	// sessão, mas o recorder apenas recebe um no-op. O importante é que
	// o retorno do OAuth já encontre o marcador para registrar a visita.
	(await cookies()).set(SESSION_MARKER_COOKIE, "1", sessionMarkerOptions());

	redirect(result.url ?? safeCallbackUrl);
}

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
