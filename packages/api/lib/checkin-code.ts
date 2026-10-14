/**
 * Códigos aceitos no credenciamento (scanner da equipe):
 * - shortId (ingressos — compacto, escaneia mais rápido);
 * - URL pública do perfil `/{evento}/profile/{shortId}` (crachás);
 * - id do participante (ingressos emitidos antes do shortId).
 */
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORTID_RE = /^[A-Za-z0-9_-]{6,16}$/;
const PROFILE_URL_RE = /\/profile\/([A-Za-z0-9_-]{4,})/;

export type CheckInCode =
	| { kind: "shortId"; shortId: string }
	| { kind: "participantId"; id: string };

/** Interpreta o valor bruto lido do QR. Lança erro se inválido. */
export function parseCheckInCode(raw: string): CheckInCode {
	const value = raw.trim();
	if (!value) {
		throw new Error("QR vazio.");
	}
	const fromUrl = PROFILE_URL_RE.exec(value)?.[1];
	if (fromUrl) {
		return { kind: "shortId", shortId: fromUrl };
	}
	if (UUID_RE.test(value)) {
		return { kind: "participantId", id: value.toLowerCase() };
	}
	if (SHORTID_RE.test(value)) {
		return { kind: "shortId", shortId: value };
	}
	throw new Error("QR inválido para credenciamento.");
}
