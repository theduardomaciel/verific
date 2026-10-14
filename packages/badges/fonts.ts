/**
 * getFontBytes(family, weight): shared cache keyed by family + weight.
 *
 * Backed by an injectable fetcher so it runs in the browser (Cache
 * API/IndexedDB via the host) and in Node (in-memory + optional disk),
 * and can later switch to the Phase-5 self-hosted source without touching
 * the renderer. Prefetch on layout save for offline printing on event day.
 * Hard fail (never silent fallback) when bytes cannot be loaded.
 */

export interface FontKey {
	family: string;
	weight: number;
}

export function fontCacheKey(family: string, weight: number): string {
	return `${family.trim().toLowerCase()}@${weight}`;
}

export interface FontFetcher {
	(key: FontKey): Promise<Uint8Array>;
}

export interface FontCacheStore {
	get(key: string): Promise<Uint8Array | undefined>;
	set(key: string, bytes: Uint8Array): Promise<void>;
}

export function createMemoryFontStore(): FontCacheStore {
	const map = new Map<string, Uint8Array>();
	return {
		async get(key: string) {
			return map.get(key);
		},
		async set(key: string, bytes: Uint8Array) {
			map.set(key, bytes);
		},
	};
}

/**
 * Legitimate static-TTF source: google-webfonts-helper metadata (open
 * source cache of the Google Fonts catalogue, OFL — embedding allowed)
 * pointing at static per-weight TTF files served by Google's own CDN
 * (`fonts.gstatic.com/s/.../*.ttf`, `font/ttf`, `ACAO: *`).
 *
 * Google's css2 endpoint no longer serves TTF (legacy `l/font` endpoint
 * returns an HTML error), and the google/fonts repo only carries variable
 * TTFs for the preset families — so static instances come from here.
 * Variable families are covered: the API lists one static file per weight.
 */
export function gwfhSlug(family: string): string {
	return family
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function gwfhMetadataUrl(family: string): string {
	return `https://gwfh.mranftl.com/api/fonts/${gwfhSlug(family)}?subsets=latin&formats=ttf`;
}

interface GwfhVariant {
	id: string;
	fontStyle: string;
	fontWeight: string;
	ttf: string;
}

/** Pick the static TTF URL for an exact weight (normal style only). */
export function pickStaticTtfUrl(
	variants: GwfhVariant[],
	weight: number,
): string | null {
	const want = String(weight);
	const match = variants.find(
		(v) => v.fontStyle === "normal" && v.fontWeight === want,
	);
	return match?.ttf ?? null;
}

/**
 * Resolve a requested weight to the nearest available one, following the
 * CSS Fonts 4 matching rule (the same face the browser would render):
 * exact match wins; 400 tries 500 first; 500 tries 400 first; below 400
 * goes down then up; above 500 goes up then down. Empty list returns the
 * request unchanged so the caller still fails loudly downstream.
 */
export function resolveFontWeight(
	requested: number,
	available: readonly number[],
): number {
	if (available.length === 0) return requested;
	if (available.includes(requested)) return requested;
	const asc = [...available].sort((a, b) => a - b);
	const desc = [...asc].reverse();
	if (requested === 400) {
		return (
			asc.find((w) => w === 500) ?? desc.find((w) => w < 400) ?? asc[0]!
		);
	}
	if (requested === 500) {
		return (
			desc.find((w) => w === 400) ?? asc.find((w) => w > 500) ?? asc[0]!
		);
	}
	if (requested < 400) {
		return (
			desc.find((w) => w < requested) ??
			asc.find((w) => w > requested) ??
			asc[0]!
		);
	}
	return (
		asc.find((w) => w > requested) ??
		desc.find((w) => w < requested) ??
		asc[0]!
	);
}

export function createStaticTtfFetcher(
	fetchImpl: typeof fetch = fetch,
): FontFetcher {
	return async ({ family, weight }) => {
		const metaRes = await fetchImpl(gwfhMetadataUrl(family));
		if (!metaRes.ok) {
			throw new Error(
				`Catálogo de fontes devolveu HTTP ${metaRes.status} para ${family} — ofereça a fonte segura de fallback explicitamente.`,
			);
		}
		const meta = (await metaRes.json()) as { variants?: GwfhVariant[] };
		const url = pickStaticTtfUrl(meta.variants ?? [], weight);
		if (!url) {
			throw new Error(
				`Peso ${weight} indisponível para ${family} (somente pesos estáticos listados) — ajuste o peso no editor ou use o fallback.`,
			);
		}
		const res = await fetchImpl(url);
		if (!res.ok) {
			throw new Error(
				`Falha ao baixar fonte ${family} @${weight}: HTTP ${res.status}.`,
			);
		}
		return new Uint8Array(await res.arrayBuffer());
	};
}

/** Backwards-compatible alias (same static-TTF source). */
export const createGoogleTtfFetcher = createStaticTtfFetcher;

/**
 * Same-origin proxy (Next route `/api/badge-fonts/file`): the browser
 * must NOT call gwfh directly — it sends no CORS headers. The proxy
 * resolves the static TTF server-side and streams the bytes, so the
 * browser only talks to our own origin (also better for CSP/offline).
 */
export function proxyFontUrl(base: string, family: string, weight: number) {
	return `${base}?family=${encodeURIComponent(family.trim())}&weight=${weight}`;
}

export function createProxiedTtfFetcher(
	base: string,
	fetchImpl: typeof fetch = fetch,
): FontFetcher {
	return async ({ family, weight }) => {
		let res: Response;
		try {
			res = await fetchImpl(proxyFontUrl(base, family, weight));
		} catch {
			throw new Error(
				`Falha de rede ao baixar fonte ${family} @${weight} — ofereça a fonte segura de fallback explicitamente.`,
			);
		}
		if (!res.ok) {
			throw new Error(
				`Fonte ${family} @${weight} indisponível (HTTP ${res.status}) — ofereça a fonte segura de fallback explicitamente.`,
			);
		}
		return new Uint8Array(await res.arrayBuffer());
	};
}

/** TTF-only UA (kept for documentation; css2 no longer serves TTF). */
export const TTF_USER_AGENT =
	"Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)";

export function css2UrlForTtf(family: string, weight: number): string {
	const encoded = family.trim().replace(/ /g, "+");
	return `https://fonts.googleapis.com/css2?family=${encoded}:wght@${weight}&display=swap`;
}

export function extractTtfUrl(cssText: string): string | null {
	const match =
		/url\((https:[^)]+\.ttf)\)\s*format\(['"]?truetype['"]?\)/i.exec(
			cssText,
		);
	return match?.[1] ?? null;
}

export class FontLoader {
	private pending = new Map<string, Promise<Uint8Array>>();

	constructor(
		private store: FontCacheStore,
		private fetcher: FontFetcher,
	) {}

	async getFontBytes(family: string, weight: number): Promise<Uint8Array> {
		const key = fontCacheKey(family, weight);
		const cached = await this.store.get(key);
		if (cached) return cached;
		const inFlight = this.pending.get(key);
		if (inFlight) return inFlight;
		const job = this.fetcher({ family, weight }).then(async (bytes) => {
			if (!bytes || bytes.length === 0) {
				throw new Error(
					`Fonte vazia para ${family} @${weight} — ofereça a fonte segura de fallback explicitamente.`,
				);
			}
			await this.store.set(key, bytes);
			this.pending.delete(key);
			return bytes;
		});
		job.catch(() => {
			this.pending.delete(key);
		});
		this.pending.set(key, job);
		return job;
	}

	/** Prefetch every family+weight used by the layout (call on save). */
	async prefetch(fonts: FontKey[]): Promise<void> {
		await Promise.all(
			fonts.map((f) => this.getFontBytes(f.family, f.weight)),
		);
	}
}
