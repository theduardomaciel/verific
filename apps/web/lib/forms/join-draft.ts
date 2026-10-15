/**
 * Rascunho local do formulário de inscrição (`JoinForm`).
 *
 * O estado do formulário vive em memória (react-hook-form): qualquer
 * remontagem do `JoinForm` o descarta. Remontagens acontecem em fluxos
 * normais — ex.: o `better-auth` refaz `fetch` da sessão ao trocar de aba
 * (`refetchOnWindowFocus`) e, para visitantes deslogados (`data === null`),
 * isso alterna `session.isPending` para `true`, o que já trocou o
 * formulário pelo esqueleto e apagou tudo. Persistir o rascunho por
 * projeto garante que o progresso sobreviva a remontagens, reloads e ao
 * login feito no meio do preenchimento (troca de conta).
 */

export interface JoinDraft {
	name: string;
	answers: Record<string, unknown>;
}

export function joinDraftKey(projectId: string) {
	return `verific:join-draft:${projectId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readJoinDraft(
	projectId: string,
	knownKeys?: Set<string>,
): JoinDraft | null {
	try {
		if (typeof window === "undefined") return null;
		const raw = window.localStorage.getItem(joinDraftKey(projectId));
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed)) return null;
		const name = typeof parsed.name === "string" ? parsed.name : "";
		const rawAnswers = isRecord(parsed.answers) ? parsed.answers : {};
		// Descarta chaves que não existem mais no formulário publicado
		// (o evento pode ter republicado o formulário com outros campos).
		const answers: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(rawAnswers)) {
			if (!knownKeys || knownKeys.has(k)) answers[k] = v;
		}
		if (!name && Object.keys(answers).length === 0) return null;
		return { name, answers };
	} catch {
		return null;
	}
}

export function writeJoinDraft(projectId: string, draft: JoinDraft) {
	try {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(
			joinDraftKey(projectId),
			JSON.stringify(draft),
		);
	} catch {
		// Modo privado/quota esgotada: o formulário segue funcionando em memória.
	}
}

export function clearJoinDraft(projectId: string) {
	try {
		if (typeof window === "undefined") return;
		window.localStorage.removeItem(joinDraftKey(projectId));
	} catch {
		// Nada a fazer.
	}
}
