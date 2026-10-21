import { randomBytes } from "node:crypto";

/** Identificador curto por participante/evento (URL + QR). */
export function generateShortId(length = 10): string {
	return randomBytes(length).toString("base64url").slice(0, length);
}
