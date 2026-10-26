/**
 * Marcador não sensível de "existe sessão neste navegador", legível pelo
 * cliente (o cookie de sessão é httpOnly). Sem ele, as páginas públicas
 * tratam o visitante como anônimo e não chamam `/api/auth/get-session`.
 * Presença com sessão expirada só custa uma chamada que volta vazia.
 */
export const SESSION_MARKER_COOKIE = "verific_has_session";

// Vive mais que a sessão (7d); o proxy o renova a cada visita ao dashboard
export const SESSION_MARKER_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Gravado antes de ir ao Google: o retorno do OAuth já encontra o marcador.
 * Se a pessoa desistir, ele só custa uma chamada que volta vazia.
 */
export function setSessionMarker() {
	const secure = location.protocol === "https:" ? "; secure" : "";
	document.cookie = `${SESSION_MARKER_COOKIE}=1; path=/; max-age=${SESSION_MARKER_MAX_AGE}; samesite=lax${secure}`;
}

export function hasSessionMarker(): boolean {
	if (typeof document === "undefined") return false;
	return document.cookie
		.split(";")
		.some((part) => part.trim() === `${SESSION_MARKER_COOKIE}=1`);
}
