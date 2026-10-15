import { type NextRequest, NextResponse } from "next/server";

import sharp from "sharp";

import { getProject } from "@/lib/data";

const SIZE = 256;

/**
 * Favicon normalizado do evento (`/{eventUrl}/favicon?theme=light|dark`).
 *
 * O `logoUrl` ("Logo quadrada") é apenas limitado a 512px no upload —
 * um envio horizontal continua horizontal, e servir o arquivo cru como
 * `<link rel="icon">` esticava o logo na aba. Aqui o logo é recomposto
 * com `contain` num PNG quadrado de fundo transparente, e a variante
 * `theme=dark` usa o `logoDarkUrl` (com fallback para o padrão).
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ eventUrl: string }> },
) {
	const { eventUrl } = await params;
	const theme = request.nextUrl.searchParams.get("theme");
	const result = await getProject(eventUrl);
	const project = result?.project;
	const src =
		theme === "dark"
			? project?.logoDarkUrl || project?.logoUrl
			: project?.logoUrl;

	if (!project || !src) {
		return new NextResponse("Ícone não encontrado.", { status: 404 });
	}

	try {
		const upstream = await fetch(src);
		if (!upstream.ok) throw new Error(`Logo retornou ${upstream.status}.`);
		const input = Buffer.from(await upstream.arrayBuffer());
		const png = await sharp(input)
			.resize(SIZE, SIZE, {
				fit: "contain",
				background: { r: 0, g: 0, b: 0, alpha: 0 },
			})
			.png()
			.toBuffer();
		return new NextResponse(new Uint8Array(png), {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control":
					"public, max-age=3600, stale-while-revalidate=86400",
			},
		});
	} catch {
		// Se a normalização falhar, serve o original em vez de quebrar
		// o ícone da aba.
		return NextResponse.redirect(src);
	}
}
