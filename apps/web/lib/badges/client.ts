/**
 * Cliente do navegador para prévia e impressão de crachás.
 * Reusa o núcleo puro (`@verific/badges`): a prévia (SVG) e o PDF
 * consomem a mesma display list, e a medida de texto usa os mesmos
 * bytes TTF do PDF (nunca DOM measureText).
 */
import { PDF } from "@libpdf/core";

import {
	FontLoader,
	buildDisplayList,
	createMemoryFontStore,
	createProxiedTtfFetcher,
	encodeQrModules,
	fontCacheKey,
	planBatchFiles,
	ptToMm,
	renderBadgeSheets,
	resolveFontWeight,
	type BadgeLayout,
	type DisplayPrimitive,
	type TextItem,
} from "@verific/badges";

export interface ThemeFontRole {
	family: string;
	weights: number[];
	scale: number;
}

export interface ThemeFontRoles {
	heading: ThemeFontRole;
	subtitle: ThemeFontRole;
	body: ThemeFontRole;
}

type FontRole = "heading" | "subtitle" | "body";

let loader: FontLoader | null = null;

/** Persistent shared cache (Cache API) with memory fallback. */
function createBrowserFontStore(): {
	get(key: string): Promise<Uint8Array | undefined>;
	set(key: string, bytes: Uint8Array): Promise<void>;
} {
	const memory = createMemoryFontStore();
	const hasCacheApi =
		typeof caches !== "undefined" &&
		typeof Request !== "undefined" &&
		typeof Response !== "undefined";
	if (!hasCacheApi) return memory;
	const cacheName = "verific-badge-fonts-v1";
	const toRequest = (key: string) =>
		`https://verific.local/badge-fonts/${encodeURIComponent(key)}.ttf`;
	return {
		async get(key: string) {
			try {
				const cache = await caches.open(cacheName);
				const res = await cache.match(toRequest(key));
				if (!res) return memory.get(key);
				const bytes = new Uint8Array(await res.arrayBuffer());
				await memory.set(key, bytes);
				return bytes;
			} catch {
				return memory.get(key);
			}
		},
		async set(key: string, bytes: Uint8Array) {
			await memory.set(key, bytes);
			try {
				const cache = await caches.open(cacheName);
				const copy = new Uint8Array(bytes);
				await cache.put(
					toRequest(key),
					new Response(copy as unknown as BodyInit, {
						headers: { "Content-Type": "font/ttf" },
					}),
				);
			} catch {
				// Sem persistência (modo privado): segue só em memória.
			}
		},
	};
}

export function getBadgeFontLoader(): FontLoader {
	if (!loader) {
		loader = new FontLoader(
			typeof window === "undefined"
				? createMemoryFontStore()
				: createBrowserFontStore(),
			// Via proxy same-origin: o gwfh não envia cabeçalhos CORS.
			createProxiedTtfFetcher("/api/badge-fonts/file"),
		);
	}
	return loader;
}

/**
 * Pesos do catálogo Google Fonts por família (fallback: array vazio).
 * Cache compartilhado — usado pelo editor (lista de pesos) e pelo
 * contexto de impressão (resolução de peso).
 */
let catalogCache: Map<string, number[]> | null = null;

async function loadCatalogWeights(): Promise<Map<string, number[]>> {
	if (catalogCache) return catalogCache;
	try {
		const catalogModule = await import("@verific/fonts/catalog");
		const map = new Map<string, number[]>();
		for (const entry of catalogModule.getCatalog()) {
			map.set(entry.family.toLowerCase(), entry.weights);
		}
		catalogCache = map;
	} catch {
		catalogCache = new Map();
	}
	return catalogCache;
}

/** Exposto para o editor montar as opções de peso por família. */
export async function getBadgeCatalogWeights(): Promise<Map<string, number[]>> {
	return loadCatalogWeights();
}

/** Pesos reais disponíveis para uma família (papel do tema ou custom). */
function weightsForFamily(
	family: string,
	roleWeights: number[],
	catalog: Map<string, number[]>,
): number[] {
	const fromCatalog = catalog.get(family.toLowerCase());
	if (fromCatalog && fromCatalog.length > 0) return fromCatalog;
	return roleWeights;
}

/**
 * Pesos permitidos para um item no editor: catálogo da família real
 * (quando disponível) ou os pesos do papel do tema. O peso pedido
 * sempre aparece, mesmo sem métricas no catálogo.
 */
export function allowedWeightsForItem(
	item: TextItem,
	roles: ThemeFontRoles,
	catalogWeights: Map<string, number[]> | null,
): number[] {
	const role = roles[item.fontRole as FontRole];
	const family = item.family || role.family;
	const base = weightsForFamily(
		family,
		role.weights,
		catalogWeights ?? new Map(),
	);
	const options = new Set(base);
	options.add(item.weight);
	return [...options].sort((a, b) => a - b);
}

/** Família e peso (pedido e resolvido) de cada item de texto ativo. */
async function resolveTextFonts(layout: BadgeLayout, roles: ThemeFontRoles) {
	const catalog = await loadCatalogWeights();
	return layout.items
		.filter(
			(item): item is TextItem => item.kind === "text" && item.enabled,
		)
		.map((item) => {
			const role = roles[item.fontRole as FontRole];
			const family = item.family || role.family;
			const available = weightsForFamily(family, role.weights, catalog);
			return {
				item,
				family,
				requested: item.weight,
				resolved: resolveFontWeight(item.weight, available),
			};
		});
}

/**
 * Famílias+pesos exigidos pelos itens de texto. O peso pedido é
 * resolvido para o mais próximo disponível (regra CSS), pois o PDF não
 * sintetiza negrito. Um par por família@peso-pedido: a display list e o
 * PDF consultam pelo peso pedido.
 */
export async function collectBadgeFonts(
	layout: BadgeLayout,
	roles: ThemeFontRoles,
): Promise<{ family: string; requested: number; resolved: number }[]> {
	const seen = new Map<
		string,
		{ family: string; requested: number; resolved: number }
	>();
	for (const { family, requested, resolved } of await resolveTextFonts(
		layout,
		roles,
	)) {
		const key = fontCacheKey(family, requested);
		if (!seen.has(key)) seen.set(key, { family, requested, resolved });
	}
	return [...seen.values()];
}

/** Pesos pedidos sem arquivo exato (informa o peso substituto usado). */
export async function missingFontWeights(
	layout: BadgeLayout,
	roles: ThemeFontRoles,
): Promise<string[]> {
	return (await resolveTextFonts(layout, roles))
		.filter(({ requested, resolved }) => requested !== resolved)
		.map(
			({ item, family, requested, resolved }) =>
				`"${item.label || item.id}": peso ${requested} indisponível em ${family} — usando ${resolved} no impresso.`,
		);
}

export interface BadgePrintContext {
	layout: BadgeLayout;
	roles: ThemeFontRoles;
	fontBytes: Map<string, Uint8Array>;
	measure: (
		text: string,
		family: string,
		weight: number,
		sizePt: number,
	) => number;
}

const registeredFaces = new Set<string>();

async function registerPreviewFace(
	family: string,
	weight: number,
	bytes: Uint8Array,
): Promise<void> {
	if (typeof document === "undefined" || !("FontFace" in window)) return;
	const key = fontCacheKey(family, weight);
	if (registeredFaces.has(key)) return;
	registeredFaces.add(key);
	try {
		// Descritores explícitos: sem eles, todas as faces da mesma
		// família caem em weight 400 e o navegador escolhe entre
		// arquivos distintos de forma ambígua — trocar a fonte de UM
		// item mudava a renderização de OUTROS itens da mesma família.
		const face = new FontFace(family, bytes as unknown as BufferSource, {
			weight: String(weight),
			style: "normal",
		});
		await face.load();
		document.fonts.add(face);
	} catch {
		// Pré-visualização segue com fallback; o PDF usa o TTF.
		registeredFaces.delete(key);
	}
}

/**
 * Carrega os TTFs (compartilhado: mesma fonte na prévia e no PDF),
 * registra no FontFace para a prévia SVG e monta a medida LibPDF.
 * Falha com erro claro (sem fallback silencioso).
 */
export async function createBadgePrintContext(
	layout: BadgeLayout,
	roles: ThemeFontRoles,
): Promise<BadgePrintContext> {
	const needed = await collectBadgeFonts(layout, roles);
	// Um download (e um FontFace) por arquivo resolvido; o mesmo array é
	// registrado sob cada peso pedido (embedShared deduplica por bytes).
	const files = new Map<string, Promise<Uint8Array>>();
	const loadFile = async (family: string, weight: number) => {
		const bytes = await getBadgeFontLoader().getFontBytes(family, weight);
		await registerPreviewFace(family, weight, bytes);
		return bytes;
	};
	const fontBytes = new Map<string, Uint8Array>();
	await Promise.all(
		needed.map(async ({ family, requested, resolved }) => {
			const fileKey = fontCacheKey(family, resolved);
			let file = files.get(fileKey);
			if (!file) {
				file = loadFile(family, resolved);
				files.set(fileKey, file);
			}
			const bytes = await file;
			fontBytes.set(fontCacheKey(family, requested), bytes);
			fontBytes.set(fileKey, bytes);
		}),
	);
	const scratch = PDF.create();
	const embedded = new Map<
		string,
		{ widthOfTextAtSize(text: string, size: number): number }
	>();
	for (const [key, bytes] of fontBytes) {
		embedded.set(key, scratch.embedFont(bytes as never) as never);
	}
	const measure = (
		text: string,
		family: string,
		weight: number,
		sizePt: number,
	) => {
		const font = embedded.get(fontCacheKey(family, weight));
		if (!font) {
			throw new Error(
				`Fonte ${family} @${weight} não carregada — ofereça o fallback explicitamente.`,
			);
		}
		return ptToMm(font.widthOfTextAtSize(text, sizePt));
	};
	return { layout, roles, fontBytes, measure };
}

export interface BadgeRow {
	name: string;
	profileUrl: string;
	fields: Record<string, string>;
}

export function buildRowPrimitives(
	ctx: BadgePrintContext,
	row: BadgeRow,
): DisplayPrimitive[] {
	return buildDisplayList(
		ctx.layout,
		{ name: row.name, fields: row.fields, qrPayload: row.profileUrl },
		{
			measure: ctx.measure,
			fontFamilyForRole: (role) => ctx.roles[role].family,
			scaleForRole: (role) => ctx.roles[role].scale,
			encodeQr: (payload) => encodeQrModules(payload),
		},
	);
}

export interface BadgeArtwork {
	bytes: Uint8Array | null;
	mime: "png" | "jpeg" | null;
	pdfBytes: Uint8Array | null;
}

/** Baixa a arte do URL do layout (raster direto; PDF via embedPage). */
export async function fetchBadgeArtwork(
	layout: BadgeLayout,
): Promise<BadgeArtwork> {
	const empty: BadgeArtwork = { bytes: null, mime: null, pdfBytes: null };
	if (!layout.artworkUrl) return empty;
	const res = await fetch(layout.artworkUrl);
	if (!res.ok) {
		throw new Error(`Falha ao baixar a arte (${res.status}).`);
	}
	const bytes = new Uint8Array(await res.arrayBuffer());
	if (layout.artworkKind === "pdf") return { ...empty, pdfBytes: bytes };
	const mime =
		layout.artworkKind === "jpg" ? ("jpeg" as const) : ("png" as const);
	return { bytes, mime, pdfBytes: null };
}

const yieldUI = () =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});

export interface PrintProgress {
	fetched: number;
	rendered: number;
	total: number | null;
	files: number;
}

export interface RunBadgePrintInput {
	ctx: BadgePrintContext;
	artwork: BadgeArtwork;
	eventUrl: string;
	title?: string;
	perFile?: number;
	testPrint?: "single" | "outlines" | null;
	fetchPage: (cursor: number) => Promise<{
		rows: BadgeRow[];
		nextCursor: number | null;
		total: number;
	}>;
	onProgress?: (progress: PrintProgress) => void;
	shouldAbort?: () => boolean;
}

export interface PrintedFile {
	blob: Blob;
	filename: string;
	count: number;
}

/** Impressão em lote no cliente: busca paginada, rende com folga p/ UI. */
export async function runBadgePrint(
	input: RunBadgePrintInput,
): Promise<{ files: PrintedFile[]; total: number }> {
	const perFile = input.perFile ?? 500;
	// 1. Busca todas as páginas (limite do servidor: 200/lote).
	const rows: BadgeRow[] = [];
	let cursor: number | null = 0;
	let total: number | null = null;
	while (cursor !== null) {
		if (input.shouldAbort?.()) throw new Error("Impressão cancelada.");
		const page = await input.fetchPage(cursor);
		rows.push(...page.rows);
		total = page.total;
		cursor = page.nextCursor;
		input.onProgress?.({
			fetched: rows.length,
			rendered: 0,
			total,
			files: 0,
		});
		await yieldUI();
	}
	if (rows.length === 0) {
		throw new Error("Nenhum participante selecionado para impressão.");
	}
	// 2. Display lists (mesmo caminho da prévia).
	const lists: DisplayPrimitive[][] = [];
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (!row) continue;
		lists.push(buildRowPrimitives(input.ctx, row));
		if (i % 10 === 0) {
			input.onProgress?.({
				fetched: rows.length,
				rendered: i,
				total,
				files: 0,
			});
			await yieldUI();
		}
	}
	// 3. Divide em arquivos e rende as folhas.
	const files: PrintedFile[] = [];
	const chunks = planBatchFiles(lists.length, perFile);
	for (const chunk of chunks) {
		if (input.shouldAbort?.()) throw new Error("Impressão cancelada.");
		const slice = lists.slice(chunk.start, chunk.start + chunk.count);
		const bytes = await renderBadgeSheets({
			layout: input.ctx.layout,
			badges: slice,
			fontBytes: input.ctx.fontBytes,
			artworkBytes: input.artwork.bytes,
			artworkMime: input.artwork.mime,
			artworkPdfBytes: input.artwork.pdfBytes,
			testPrint: input.testPrint,
			title: input.title ?? `Crachás — ${input.eventUrl}`,
		});
		const blob = new Blob([bytes as unknown as BlobPart], {
			type: "application/pdf",
		});
		files.push({
			blob,
			filename:
				chunks.length > 1
					? `crachas-${input.eventUrl}-parte-${chunk.fileIndex + 1}-de-${chunks.length}.pdf`
					: `crachas-${input.eventUrl}.pdf`,
			count: slice.length,
		});
		input.onProgress?.({
			fetched: rows.length,
			rendered: rows.length,
			total,
			files: files.length,
		});
		await yieldUI();
	}
	return { files, total: rows.length };
}
