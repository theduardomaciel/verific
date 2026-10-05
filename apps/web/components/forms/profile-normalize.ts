/** Normalização dos campos sociais/perfil (puro, sem React). */

export const str = (v: string | null | undefined) => (v ?? "").trim();

function lastSegment(v: string): string | null {
	const clean = v
		.replace(/^https?:\/\//i, "")
		.split(/[?#]/)[0]
		?.split("/")
		.filter(Boolean)
		.pop()
		?.replace(/^@/, "");
	return clean || null;
}

export function githubHandle(raw: string | null | undefined): string | null {
	const v = str(raw).replace(/^@/, "");
	if (!v) return null;
	if (/^https?:\/\//i.test(v) || v.includes("/") || v.includes(".")) {
		return lastSegment(v);
	}
	return v;
}

/** Aceita usuário ou URL completa (ex: "fulana" ou "https://instagram.com/fulana"). */
export function socialUrl(
	raw: string | null | undefined,
	handleBase?: string,
): string | null {
	const v = str(raw).replace(/^@/, "");
	if (!v) return null;
	if (/^https?:\/\//i.test(v)) return v;
	if (v.includes(".") || v.includes("/")) return `https://${v}`;
	if (handleBase) return `${handleBase}${v}`;
	return null;
}

/** Preenchido? (p/ o progresso da seção: chips com check). */
export function isFilled(v: unknown): boolean {
	if (v === undefined || v === null || v === "") return false;
	if (Array.isArray(v)) return v.length > 0;
	if (typeof v === "boolean") return v;
	return true;
}
