import { type NextRequest } from "next/server";

/**
 * GET /api/badge-fonts/file?family=Poppins&weight=700
 *
 * Proxy same-origin para os TTFs estáticos das fontes do tema. O browser
 * não pode consultar o catálogo gwfh diretamente (sem cabeçalhos CORS),
 * então a resolução família+peso → URL do TTF acontece aqui no servidor
 * e os bytes do fonts.gstatic.com são repassados com cache longo.
 * Sem autenticação: só serve arquivos de fonte públicos (OFL).
 */

export const dynamic = "force-dynamic";

const META_TTL_MS = 24 * 60 * 60 * 1000;
const metaCache = new Map<string, { at: number; variants: Variant[] }>();

interface Variant {
	fontStyle: string;
	fontWeight: string;
	ttf: string;
}

function slug(family: string): string {
	return family
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function isValidFamily(family: string): boolean {
	return /^[A-Za-z0-9][A-Za-z0-9 ]{0,63}$/.test(family.trim());
}

function isValidWeight(weight: number): boolean {
	return Number.isInteger(weight) && weight >= 100 && weight <= 900;
}

async function fetchVariants(family: string): Promise<Variant[]> {
	const key = slug(family);
	const cached = metaCache.get(key);
	if (cached && Date.now() - cached.at < META_TTL_MS) return cached.variants;
	const res = await fetch(
		`https://gwfh.mranftl.com/api/fonts/${key}?subsets=latin&formats=ttf`,
		{ next: { revalidate: 86400 } },
	);
	if (!res.ok) {
		throw new Error(`Catálogo de fontes devolveu HTTP ${res.status}.`);
	}
	const meta = (await res.json()) as { variants?: Variant[] };
	const variants = meta.variants ?? [];
	metaCache.set(key, { at: Date.now(), variants });
	return variants;
}

function isTtf(bytes: Uint8Array): boolean {
	return (
		bytes.length > 12 &&
		((bytes[0] === 0x00 &&
			bytes[1] === 0x01 &&
			bytes[2] === 0x00 &&
			bytes[3] === 0x00) ||
			(bytes[0] === 0x4f &&
				bytes[1] === 0x54 &&
				bytes[2] === 0x54 &&
				bytes[3] === 0x4f))
	);
}

export async function GET(req: NextRequest) {
	const family = req.nextUrl.searchParams.get("family") ?? "";
	const weight = Number(req.nextUrl.searchParams.get("weight"));
	if (!isValidFamily(family) || !isValidWeight(weight)) {
		return Response.json(
			{ error: "Parâmetros inválidos (family, weight 100–900)." },
			{ status: 400 },
		);
	}
	let ttfUrl: string | null = null;
	try {
		const variants = await fetchVariants(family);
		ttfUrl =
			variants.find(
				(v) =>
					v.fontStyle === "normal" && v.fontWeight === String(weight),
			)?.ttf ?? null;
	} catch (e) {
		return Response.json(
			{ error: e instanceof Error ? e.message : "Falha no catálogo." },
			{ status: 502 },
		);
	}
	if (!ttfUrl || !ttfUrl.startsWith("https://fonts.gstatic.com/")) {
		return Response.json(
			{ error: `Peso ${weight} indisponível para ${family.trim()}.` },
			{ status: 404 },
		);
	}
	const file = await fetch(ttfUrl);
	if (!file.ok) {
		return Response.json(
			{ error: `Fonte indisponível (HTTP ${file.status}).` },
			{ status: 502 },
		);
	}
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!isTtf(bytes) || bytes.length > 5 * 1024 * 1024) {
		return Response.json(
			{ error: "Arquivo de fonte inválido." },
			{ status: 502 },
		);
	}
	return new Response(bytes as unknown as BodyInit, {
		status: 200,
		headers: {
			"Content-Type": "font/ttf",
			"Content-Length": String(bytes.length),
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}
