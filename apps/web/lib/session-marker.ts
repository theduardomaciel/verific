/**
 * Marcador não sensível de "existe sessão neste navegador".
 *
 * Só o `ProfileVisitRecorder` o consulta, para não gastar uma invocação
 * com visitantes anônimos. Nenhuma UI depende dele: ausência apenas deixa
 * de registrar a visita; presença com sessão expirada resulta em no-op.
 */
export const SESSION_MARKER_COOKIE = "verific_has_session";

export function hasSessionMarker(): boolean {
	if (typeof document === "undefined") return false;
	return document.cookie
		.split(";")
		.some((part) => part.trim() === `${SESSION_MARKER_COOKIE}=1`);
}
