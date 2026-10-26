/**
 * Rascunho local do formulário de inscrição (`JoinForm`), por projeto: o
 * estado do react-hook-form some quando o formulário remonta, e o rascunho
 * mantém o progresso em reloads e no login feito no meio do preenchimento.
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
