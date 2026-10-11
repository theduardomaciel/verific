/**
 * Gera `packages/fonts/catalog.json` a partir da Google Fonts Developer API.
 *
 * Uso:
 *   GOOGLE_FONTS_API_KEY=... pnpm --filter @verific/fonts generate-catalog
 *
 * A chave é usada SOMENTE por este script (tempo de geração). Nada em
 * runtime — servidor, editor ou páginas públicas — usa a chave ou chama a
 * API: o catálogo comprometido é estático e o `css2` público não precisa
 * de chave.
 *
 * Sem a chave, o script aborta com instruções (não sobrescreve o catálogo).
 */
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { FontCatalogEntry, FontCategory } from "../types";

const API_URL =
	"https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity";
const MAX_FONTS = 500;

interface WebfontFamily {
	family: string;
	category?: string;
	variants?: string[];
	subsets?: string[];
}

const CATEGORY_MAP: Record<string, FontCategory> = {
	"sans-serif": "sans-serif",
	serif: "serif",
	display: "display",
	handwriting: "handwriting",
	monospace: "monospace",
};

function parseVariant(
	variant: string,
): { weight: number; italic: boolean } | null {
	const italic = variant.endsWith("italic");
	const base = italic ? variant.slice(0, -6) || "regular" : variant;
	let weight: number;
	if (base === "regular") weight = 400;
	else if (base === "bold") weight = 700;
	else if (/^\d+$/.test(base)) weight = Number(base);
	else return null;
	if (weight < 100 || weight > 900) return null;
	return { weight, italic };
}

function toEntry(
	item: WebfontFamily,
	popularity: number,
): FontCatalogEntry | null {
	if (!item.family || !/^[A-Za-z0-9 ]{1,64}$/.test(item.family)) return null;
	const weights = new Set<number>();
	const styles = new Set<"normal" | "italic">();
	for (const variant of item.variants ?? []) {
		const parsed = parseVariant(variant);
		if (!parsed) continue;
		weights.add(parsed.weight);
		styles.add(parsed.italic ? "italic" : "normal");
	}
	if (weights.size === 0) return null;
	return {
		family: item.family,
		category: CATEGORY_MAP[item.category ?? ""] ?? "sans-serif",
		weights: [...weights].sort((a, b) => a - b),
		styles: [...styles].sort(),
		subsets: [...(item.subsets ?? [])].sort(),
		popularity,
		license: "OFL",
	};
}

async function main(): Promise<void> {
	const apiKey = process.env["GOOGLE_FONTS_API_KEY"];
	if (!apiKey) {
		console.error(
			"GOOGLE_FONTS_API_KEY ausente.\n" +
				"Obtenha uma chave em https://console.cloud.google.com/apis/library/webfonts.googleapis.com " +
				"(é gratuita) e rode:\n" +
				"  GOOGLE_FONTS_API_KEY=... pnpm --filter @verific/fonts generate-catalog",
		);
		process.exit(1);
	}
	const response = await fetch(`${API_URL}&key=${apiKey}`);
	if (!response.ok) {
		throw new Error(
			`Google Fonts API devolveu ${response.status}: ${await response.text()}`,
		);
	}
	const payload = (await response.json()) as { items?: WebfontFamily[] };
	const items = payload.items ?? [];
	const fonts: FontCatalogEntry[] = [];
	items.slice(0, MAX_FONTS).forEach((item, index) => {
		const entry = toEntry(item, index + 1);
		if (entry) fonts.push(entry);
	});
	const scriptDir = dirname(fileURLToPath(import.meta.url));
	const outPath = join(scriptDir, "..", "catalog.json");
	await writeFile(
		outPath,
		JSON.stringify(
			{
				generatedBy: `google-fonts-developer-api top ${MAX_FONTS} by popularity`,
				count: fonts.length,
				fonts,
			},
			null,
			0,
		) + "\n",
	);
	console.log(`Catálogo gerado: ${fonts.length} fontes em ${outPath}`);
}

await main();
