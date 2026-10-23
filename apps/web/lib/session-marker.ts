/**
 * Marcador não sensível de "existe sessão neste navegador".
 *
 * Só o `ProfileVisitRecorder` o consulta, para não gastar uma invocação
 * com visitantes anônimos. Nenhuma UI depende dele: ausência apenas deixa
 * de registrar a visita; presença com sessão expirada resulta em no-op.
 */
export const SESSION_MARKER_COOKIE = "verific_has_session";

// Vive mais que a sessão (7d, renovável): marcador expirado só custa um
// no-op; expirar antes da sessão impediria visitas legítimas no evento.
const SESSION_MARKER_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Gravado antes de ir ao Google: o retorno do OAuth já encontra o marcador
 * para registrar a visita. Se a pessoa desistir, ele só gera no-ops.
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
