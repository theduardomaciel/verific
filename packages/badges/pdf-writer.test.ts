import { PDF } from "@libpdf/core";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { buildDisplayList, type DisplayPrimitive } from "./display-list";
import { renderBadgeSheets, renderBadgesToPdf } from "./pdf-writer";
import {
	assertPublicProfilePayload,
	buildProfileUrl,
	encodeQrModules,
} from "./qr-payload";
import { badgeLayoutSchema, defaultBadgeItems } from "./schema";
import { mmToPt } from "./units";

async function fixture(name: string): Promise<Uint8Array> {
	return new Uint8Array(
		await readFile(new URL(`./fixtures/${name}`, import.meta.url)),
	);
}

function layout() {
	return badgeLayoutSchema.parse({
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
}

async function renderOne() {
	const [rem700, hanken400] = await Promise.all([
		fixture("REM-700.ttf"),
		fixture("HankenGrotesk-400.ttf"),
	]);
	const fontBytes = new Map<string, Uint8Array>([
		["rem@700", rem700],
		["hanken grotesk@400", hanken400],
	]);
	// Measure with the SAME embedded bytes via LibPDF (pt → mm).
	const measurePdf = PDF.create();
	const embedded = new Map<
		string,
		{ widthOfTextAtSize(t: string, s: number): number }
	>();
	for (const [key, bytes] of fontBytes) {
		embedded.set(key, measurePdf.embedFont(bytes as never) as never);
	}
	const families = {
		heading: "REM",
		subtitle: "REM",
		body: "Hanken Grotesk",
	};
	const measure = (
		text: string,
		family: string,
		weight: number,
		sizePt: number,
	) =>
		(embedded
			.get(`${family.toLowerCase()}@${weight}`)
			?.widthOfTextAtSize(text, sizePt) ?? text.length * sizePt * 0.5) *
		0.3527777778;
	const payload = buildProfileUrl(
		"https://example.com",
		"my-event",
		"Ab12Cd34Ef",
	);
	assertPublicProfilePayload(payload);
	const primitives = buildDisplayList(
		layout(),
		{
			name: "Conceição de Almeida Souza",
			fields: { institution: "UFAL" },
			qrPayload: payload,
		},
		{
			measure,
			fontFamilyForRole: (role) => families[role],
			scaleForRole: () => 1,
			encodeQr: (text) => encodeQrModules(text),
		},
	);
	return { fontBytes, primitives, payload };
}

describe("pdf-writer", () => {
	it("renders badges at exact physical dimensions with vector text", async () => {
		const { fontBytes, primitives } = await renderOne();
		const bytes = await renderBadgesToPdf({
			layout: layout(),
			badges: [primitives],
			fontBytes,
			artworkBytes: null,
			artworkMime: null,
			artworkPdfBytes: null,
		});
		const pdf = await PDF.load(bytes as never);
		expect(pdf.getPageCount()).toBe(1);
		const page = pdf.getPage(0);
		expect(page?.width).toBeCloseTo(mmToPt(90), 2);
		expect(page?.height).toBeCloseTo(mmToPt(55), 2);
		// Accented text round-trips through the embedded subsetted font.
		const extracted = page?.extractText() as unknown as {
			lines?: { text?: string }[];
		};
		const full = (extracted.lines ?? [])
			.map((l) => l.text ?? "")
			.join("\n");
		expect(full).toContain("Conceição");
	}, 60_000);

	it("embeds artwork and fonts once — 500 badges stay small", async () => {
		const { fontBytes, primitives } = await renderOne();
		const png = new Uint8Array(
			Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
				"base64",
			),
		);
		const one = await renderBadgesToPdf({
			layout: layout(),
			badges: [primitives],
			fontBytes,
			artworkBytes: png,
			artworkMime: "png",
			artworkPdfBytes: null,
		});
		const many = await renderBadgesToPdf({
			layout: layout(),
			badges: Array.from({ length: 500 }, () => primitives),
			fontBytes,
			artworkBytes: png,
			artworkMime: "png",
			artworkPdfBytes: null,
		});
		// 500x badges must stay small: fonts + artwork embedded once and
		// QR emitted as run-length bars in a single path (not per-module
		// rects, which balloon to ~50MB).
		expect(many.length).toBeLessThan(one.length * 100);
		expect(many.length).toBeLessThan(5 * 1024 * 1024);
	}, 120_000);

	it("embeds a PDF artwork page as a reusable object", async () => {
		const { fontBytes, primitives } = await renderOne();
		const src = PDF.create();
		const p = src.addPage({ width: mmToPt(90), height: mmToPt(55) });
		p.drawText("ARTWORK", { x: 50, y: 50, size: 24 });
		const artBytes = (await src.save()) as unknown as Uint8Array;
		const bytes = await renderBadgesToPdf({
			layout: layout(),
			badges: [primitives],
			fontBytes,
			artworkBytes: null,
			artworkMime: null,
			artworkPdfBytes: artBytes,
		});
		const pdf = await PDF.load(bytes as never);
		expect(pdf.getPageCount()).toBe(1);
	}, 60_000);

	it("draws QR modules as vectors with a quiet zone at minimum size", async () => {
		const { primitives, payload } = await renderOne();
		const qr = primitives.find((p) => p.kind === "qr");
		expect(qr?.kind).toBe("qr");
		if (qr?.kind !== "qr") return;
		// Modules match a fresh encode of the same payload.
		const fresh = encodeQrModules(payload);
		expect(qr.modules.length).toBe(fresh.length);
		expect(qr.modules[0]?.length).toBe(fresh.length);
		expect(qr.quietModules).toBeGreaterThanOrEqual(4);
		// At the default layout the QR side is ~0.3*80=24mm wide … check floor.
		const sideMm = Math.min(qr.rect.w, qr.rect.h);
		expect(sideMm).toBeGreaterThanOrEqual(15);
	});

	it("renders imposed A4 sheets in both modes with crop marks", async () => {
		const { fontBytes, primitives } = await renderOne();
		const png = new Uint8Array(
			Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
				"base64",
			),
		);
		const badges = Array.from({ length: 10 }, () => primitives);
		for (const mode of ["data-only", "full"] as const) {
			const sheetLayout = { ...layout(), mode };
			const bytes = await renderBadgeSheets({
				layout: sheetLayout,
				badges,
				fontBytes,
				artworkBytes: png,
				artworkMime: "png",
				artworkPdfBytes: null,
			});
			const pdf = await PDF.load(bytes as never);
			expect(pdf.getPageCount()).toBe(2);
			const page = pdf.getPage(0);
			expect(page?.width).toBeCloseTo(mmToPt(210), 1);
			expect(page?.height).toBeCloseTo(mmToPt(297), 1);
			const extracted = page?.extractText() as unknown as {
				text?: string;
			};
			expect(extracted.text ?? "").toContain("Conceição");
		}
	}, 120_000);

	it("renders rotated sheets and outlines test prints", async () => {
		const { fontBytes, primitives } = await renderOne();
		const rotatedLayout = {
			...layout(),
			mode: "data-only" as const,
			badgeW: 120,
			badgeH: 40,
		};
		const rotated = await renderBadgeSheets({
			layout: rotatedLayout,
			badges: Array.from({ length: 8 }, () => primitives),
			fontBytes,
			artworkBytes: null,
			artworkMime: null,
			artworkPdfBytes: null,
		});
		const rotatedPdf = await PDF.load(rotated as never);
		expect(rotatedPdf.getPageCount()).toBe(1);

		const outlines = await renderBadgeSheets({
			layout: layout(),
			badges: [primitives],
			fontBytes,
			artworkBytes: null,
			artworkMime: null,
			artworkPdfBytes: null,
			testPrint: "outlines",
		});
		const outlinesPdf = await PDF.load(outlines as never);
		expect(outlinesPdf.getPageCount()).toBe(1);

		// Alignment sheet needs no participant data.
		const emptyOutlines = await renderBadgeSheets({
			layout: layout(),
			badges: [],
			fontBytes: new Map(),
			artworkBytes: null,
			artworkMime: null,
			artworkPdfBytes: null,
			testPrint: "outlines",
		});
		expect((await PDF.load(emptyOutlines as never)).getPageCount()).toBe(1);
	}, 120_000);

	describe("single badge primitives", () => {
		const plainLayout = badgeLayoutSchema.parse({
			badgeW: 90,
			badgeH: 55,
			freeArea: { x: 5, y: 5, w: 80, h: 45 },
			items: [],
		});
		const render = (
			primitives: DisplayPrimitive[],
			extra: Partial<Parameters<typeof renderBadgesToPdf>[0]> = {},
		) =>
			renderBadgesToPdf({
				layout: plainLayout,
				badges: [primitives],
				fontBytes: new Map(),
				artworkBytes: null,
				artworkMime: null,
				artworkPdfBytes: null,
				...extra,
			});
		const text: DisplayPrimitive = {
			kind: "text",
			xMm: 10,
			yMm: 10,
			maxWidthMm: 70,
			maxLines: 2,
			lines: ["Linha um", "Linha dois"],
			fontRole: "heading",
			family: "REM",
			fontSizePt: 20,
			weight: 700,
			color: "#000000",
			align: "left",
			lineHeightPt: 24,
		};

		it("puts the first baseline one font size below the box top, like the preview", async () => {
			const bytes = await render([text], {
				fontBytes: new Map([["rem@700", await fixture("REM-700.ttf")]]),
			});
			const page = (await PDF.load(bytes as never)).getPage(0);
			if (!page) throw new Error("expected one page");
			const { lines } = page.extractText() as unknown as {
				lines: { baseline: number }[];
			};
			const pageH = mmToPt(55);
			expect(lines[0]?.baseline).toBeCloseTo(pageH - mmToPt(10) - 20, 1);
			expect(lines[1]?.baseline).toBeCloseTo(
				pageH - mmToPt(10) - 20 - 24,
				1,
			);
		});

		it("fails instead of falling back to Helvetica when a font is missing", async () => {
			await expect(render([text])).rejects.toThrow(/REM @700/);
		});

		it("draws logo images", async () => {
			const logo: DisplayPrimitive = {
				kind: "image",
				rect: { x: 10, y: 10, w: 20, h: 10 },
				url: "https://example.com/logo.png",
			};
			await expect(render([logo])).rejects.toThrow(/Logo/);
			const png = new Uint8Array(
				Buffer.from(
					"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
					"base64",
				),
			);
			const bytes = await render([logo], {
				logos: new Map([[logo.url, { bytes: png, mime: "png" }]]),
			});
			expect(Buffer.from(bytes).toString("latin1")).toMatch(
				/\/Subtype\s*\/Image/,
			);
		});
	});
});
