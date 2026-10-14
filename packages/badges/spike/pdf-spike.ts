/**
 * Spike: one badge in Node via LibPDF adapter.
 * Run: pnpm --filter @verific/badges spike:pdf
 * Verifies: font embed + measure ("Conceição"), rect/line/rounded-rect,
 * QR vector modules, PNG embed-once reuse (500 badges size).
 */
import { buildDisplayList } from "../display-list";
import {
	FontLoader,
	createGoogleTtfFetcher,
	createMemoryFontStore,
} from "../fonts";
import { renderBadgesToPdf } from "../pdf-writer";
import { buildProfileUrl, encodeQrModules } from "../qr-payload";
import { defaultBadgeItems, badgeLayoutSchema } from "../schema";
import { mmToPt } from "../units";

const PNG_1PX = Uint8Array.from(
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
		"base64",
	),
);

async function main() {
	const layout = badgeLayoutSchema.parse({
		mode: "full",
		badgeW: 90,
		badgeH: 55,
		freeArea: { x: 5, y: 5, w: 80, h: 45, radius: 3, padding: 3 },
		items: defaultBadgeItems().map((item) =>
			item.kind === "text" && item.id === "secondary-1"
				? { ...item, source: "institution" }
				: item,
		),
	});

	const loader = new FontLoader(
		createMemoryFontStore(),
		createGoogleTtfFetcher(),
	);
	const families = {
		heading: "REM",
		subtitle: "REM",
		body: "Hanken Grotesk",
	};
	const weights = new Map<string, { family: string; weight: number }>();
	for (const item of layout.items) {
		if (item.kind !== "text") continue;
		const family = families[item.fontRole];
		weights.set(`${family.toLowerCase()}@${item.weight}`, {
			family,
			weight: item.weight,
		});
	}
	const fontBytes = new Map<string, Uint8Array>();
	for (const { family, weight } of weights.values()) {
		const bytes = await loader.getFontBytes(family, weight);
		fontBytes.set(`${family.toLowerCase()}@${weight}`, bytes);
		console.log(`font ${family} @${weight}: ${bytes.length} bytes`);
	}

	// Measure with the embedded font via LibPDF (same bytes as PDF).
	const { PDF } = await import("@libpdf/core");
	const measurePdf = PDF.create();
	const measureFonts = new Map<
		string,
		{ widthOfTextAtSize(t: string, s: number): number }
	>();
	for (const [key, bytes] of fontBytes) {
		measureFonts.set(key, measurePdf.embedFont(bytes as never) as never);
	}
	const measure = (
		text: string,
		family: string,
		weight: number,
		sizePt: number,
	) =>
		(measureFonts
			.get(`${family.toLowerCase()}@${weight}`)
			?.widthOfTextAtSize(text, sizePt) ?? text.length * sizePt * 0.5) *
		0.3527777778; // pt → mm

	const payload = buildProfileUrl(
		"https://example.com",
		"my-event",
		"Ab12Cd34Ef",
	);
	const data = {
		name: "Conceição de Almeida Souza e Silva",
		fields: { institution: "UFAL — Campus Arapiraca" },
		qrPayload: payload,
	};
	const primitives = buildDisplayList(layout, data, {
		measure,
		fontFamilyForRole: (role) => families[role],
		scaleForRole: () => 1,
		encodeQr: (text) => encodeQrModules(text),
	});
	console.log(`display list: ${primitives.length} primitives`);

	const one = await renderBadgesToPdf({
		layout,
		badges: [primitives],
		fontBytes,
		artworkBytes: PNG_1PX,
		artworkMime: "png",
		artworkPdfBytes: null,
		title: "Badge spike",
	});
	console.log(`1 badge: ${one.length} bytes`);

	const many = await renderBadgesToPdf({
		layout,
		badges: Array.from({ length: 500 }, () => primitives),
		fontBytes,
		artworkBytes: PNG_1PX,
		artworkMime: "png",
		artworkPdfBytes: null,
		title: "Badge spike x500",
	});
	console.log(
		`500 badges: ${many.length} bytes (${(many.length / 1024).toFixed(1)} KiB)`,
	);

	// PDF artwork as reusable XObject.
	const singleBadgePdf = PDF.create();
	{
		const p = singleBadgePdf.addPage({
			width: mmToPt(90),
			height: mmToPt(55),
		});
		p.drawText("ARTWORK", { x: 50, y: 50, size: 24 });
	}
	const artBytes = (await singleBadgePdf.save()) as unknown as Uint8Array;
	const withArt = await renderBadgesToPdf({
		layout,
		badges: [primitives],
		fontBytes,
		artworkBytes: null,
		artworkMime: null,
		artworkPdfBytes: artBytes,
		title: "Badge spike pdf-art",
	});
	console.log(
		`1 badge + embedded PDF page: ${withArt.length} bytes — embedPage OK`,
	);

	const { writeFile } = await import("node:fs/promises");
	await writeFile(new URL("./spike-output-1.pdf", import.meta.url), one);
	console.log("wrote spike/spike-output-1.pdf");
}

await main();
