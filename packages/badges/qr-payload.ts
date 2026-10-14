/**
 * QR payload: participant's canonical public profile link ONLY.
 * Never a database id, email or account token.
 */
import { encode } from "uqr";

const SENSITIVE_PATTERNS = [
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // uuid
	/@/, // email
	/[?&](token|session|auth)=/i,
];

export function buildProfilePath(eventUrl: string, shortId: string): string {
	const url = eventUrl.trim().replace(/^\/+|\/+$/g, "");
	const sid = shortId.trim().replace(/^\/+|\/+$/g, "");
	if (!url || !sid) throw new Error("eventUrl e shortId são obrigatórios.");
	if (SENSITIVE_PATTERNS.some((re) => re.test(url) || re.test(sid))) {
		throw new Error("Identificador sensível detectado no payload do QR.");
	}
	return `/${url}/profile/${sid}`;
}

export function buildProfileUrl(
	baseUrl: string,
	eventUrl: string,
	shortId: string,
): string {
	const base = baseUrl.replace(/\/$/, "");
	const path = buildProfilePath(eventUrl, shortId);
	const full = `${base}${path}`;
	if (SENSITIVE_PATTERNS.some((re) => re.test(full))) {
		throw new Error("Payload do QR contém identificador sensível.");
	}
	return full;
}

/** Encode a payload to a boolean module matrix (no quiet zone). ECC M. */
export function encodeQrModules(payload: string): boolean[][] {
	assertPublicProfilePayload(payload);
	return encode(payload, { ecc: "M" }).data;
}

/** Guard used in tests: payload must be a public profile link only. */
export function assertPublicProfilePayload(payload: string): void {
	if (/@/.test(payload)) {
		throw new Error("QR não deve conter email.");
	}
	if (/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(payload)) {
		throw new Error("QR não deve conter UUID do banco.");
	}
	if (!/\/profile\/[A-Za-z0-9_-]{4,}/.test(payload)) {
		throw new Error("QR deve codificar o link público do perfil.");
	}
}
