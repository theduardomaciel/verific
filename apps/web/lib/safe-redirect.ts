const BASE = "http://localhost";

/**
 * Caminho da própria origem para redirecionar, ou `fallback`.
 *
 * Recusa o que o navegador resolveria para outro domínio: `//host`,
 * `/\host` (a barra invertida vira `/`) e URLs absolutas.
 */
export function safeRedirectPath(value: unknown, fallback: string): string {
	if (typeof value !== "string" || !value.startsWith("/")) return fallback;

	let url: URL;
	try {
		url = new URL(value, BASE);
	} catch {
		return fallback;
	}
	// Segmentos de ponto (`/.//host`) normalizam para `//host`
	if (url.origin !== BASE || url.pathname.startsWith("//")) return fallback;

	return `${url.pathname}${url.search}${url.hash}`;
}
