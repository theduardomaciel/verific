/**
 * Internal adapter over `@libpdf/core` (pinned exact, beta). The rest of
 * the code must not import LibPDF directly — only through this module.
 * RGB only (no CMYK/ICC) — known limitation, documented for review.
 */
import { PDF, ops, rgb, type PDFPage } from "@libpdf/core";

import { planSheets, type TestPrint } from "./sheet";
import { mmToPt } from "./units";

import type { DisplayPrimitive } from "./display-list";
import type { BadgeLayout } from "./schema";

type ContentTarget = Pick<
	PDFPage,
	| "drawRectangle"
	| "drawText"
	| "drawImage"
	| "drawOperators"
	| "drawPage"
	| "drawLine"
>;

export interface PdfWriterFonts {
	/** family@weight → embedded font ref (opaque to callers). */
	get(family: string, weight: number): unknown;
}

export interface SharedArtwork {
	fontBytes: Map<string, Uint8Array>;
	/** Artwork bytes (PNG/JPEG, or rasterized SVG/PDF preview). */
	artworkBytes: Uint8Array | null;
	artworkMime: "png" | "jpeg" | null;
	/** PDF artwork page bytes when LibPDF embedPage is used. */
	artworkPdfBytes: Uint8Array | null;
}

export interface RenderBadgePdfInput extends SharedArtwork {
	layout: BadgeLayout;
	/** One display list per badge (already built via buildDisplayList). */
	badges: DisplayPrimitive[][];
	title?: string;
}

export interface SheetRenderInput extends SharedArtwork {
	layout: BadgeLayout;
	/** One display list per badge, in sheet order. */
	badges: DisplayPrimitive[][];
	testPrint?: TestPrint | null;
	title?: string;
	markLengthMm?: number;
	markOffsetMm?: number;
}

function hexToRgb(hex: string) {
	const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
	const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
	const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
	return rgb(r, g, b);
}

function fontKey(family: string, weight: number): string {
	return `${family.trim().toLowerCase()}@${weight}`;
}

type PDFDoc = ReturnType<typeof PDF.create>;

interface EmbeddedResources {
	embedded: Map<string, ReturnType<PDFDoc["embedFont"]>>;
	artworkImage: ReturnType<PDFDoc["embedPng"]> | null;
	artworkPage: Awaited<ReturnType<PDFDoc["embedPage"]>> | null;
}

async function embedShared(
	pdf: PDFDoc,
	input: SharedArtwork,
): Promise<EmbeddedResources> {
	// Embed fonts once (subset automatically on save). Chaves distintas
	// podem apontar para os mesmos bytes (peso resolvido): embute uma vez.
	const embedded = new Map<string, ReturnType<PDF["embedFont"]>>();
	const byBytes = new Map<Uint8Array, ReturnType<PDF["embedFont"]>>();
	for (const [key, bytes] of input.fontBytes) {
		const existing = byBytes.get(bytes);
		if (existing) {
			embedded.set(key, existing);
			continue;
		}
		const font = pdf.embedFont(bytes as unknown as Uint8Array);
		byBytes.set(bytes, font);
		embedded.set(key, font);
	}

	// Embed artwork ONCE, reuse for every badge.
	let artworkImage: ReturnType<PDF["embedPng"]> | null = null;
	if (input.artworkBytes && input.artworkMime) {
		artworkImage =
			input.artworkMime === "png"
				? pdf.embedPng(input.artworkBytes as unknown as Uint8Array)
				: pdf.embedJpeg(input.artworkBytes as unknown as Uint8Array);
	}
	let artworkPage: Awaited<ReturnType<PDF["embedPage"]>> | null = null;
	if (input.artworkPdfBytes) {
		const src = await PDF.load(
			input.artworkPdfBytes as unknown as Uint8Array,
		);
		artworkPage = await pdf.embedPage(src, 0);
	}
	return { embedded, artworkImage, artworkPage };
}

interface BadgeContentOptions {
	layout: BadgeLayout;
	primitives: DisplayPrimitive[];
	res: EmbeddedResources;
	badgeWpt: number;
	badgeHpt: number;
	/** Badge-box bottom-left in target pt space (0,0 under a rotation matrix). */
	originXpt: number;
	originYpt: number;
	/** Calibration shift in badge-local top-left mm (data-only mode). */
	calDxMm: number;
	calDyMm: number;
	/** Artwork rect in badge-local top-left mm (bleed-expanded on sheets). */
	artwork:
		| { draw: false }
		| { draw: true; xMm: number; yMm: number; wMm: number; hMm: number };
}

/**
 * Draw one badge's content in badge-local coordinates. Shared by single
 * pages and sheets (sheets wrap rotated cells in a CTM rotation matrix).
 */
function drawBadgeContent(target: ContentTarget, o: BadgeContentOptions): void {
	const toX = (xMm: number) => o.originXpt + mmToPt(xMm);
	const toY = (yMm: number, hMm: number) =>
		o.originYpt + o.badgeHpt - mmToPt(yMm + hMm);

	// Full-badge mode: artwork first (background).
	if (o.artwork.draw) {
		const ax = toX(o.artwork.xMm);
		const ay = toY(o.artwork.yMm, o.artwork.hMm);
		const aw = mmToPt(o.artwork.wMm);
		const ah = mmToPt(o.artwork.hMm);
		if (o.res.artworkPage) {
			target.drawPage(o.res.artworkPage, {
				x: ax,
				y: ay,
				width: aw,
				height: ah,
			});
		} else if (o.res.artworkImage) {
			target.drawImage(o.res.artworkImage, {
				x: ax,
				y: ay,
				width: aw,
				height: ah,
			});
		}
	}

	for (const p of o.primitives) {
		if (p.kind === "rect") {
			target.drawRectangle({
				x: toX(p.rect.x + o.calDxMm),
				y: toY(p.rect.y + o.calDyMm, p.rect.h),
				width: mmToPt(p.rect.w),
				height: mmToPt(p.rect.h),
				color: hexToRgb(p.fill),
				cornerRadius: mmToPt(p.radiusMm),
			});
		} else if (p.kind === "text") {
			const key = fontKey(p.family, p.weight);
			const font = o.res.embedded.get(key);
			if (!font) {
				throw new Error(
					`Fonte ${p.family} @${p.weight} não embutida no PDF — carregue a fonte ou ajuste o peso no editor.`,
				);
			}
			const sizeMm = p.fontSizePt * 0.3527777778;
			const lineMm = p.lineHeightPt * 0.3527777778;
			// Mesma regra da prévia: 1ª linha na baseline yMm + 1em; demais a +entrelinha.
			p.lines.forEach((line, i) => {
				target.drawText(line, {
					x: toX(p.xMm + o.calDxMm),
					y: toY(p.yMm + o.calDyMm + sizeMm + i * lineMm, 0),
					size: p.fontSizePt,
					color: hexToRgb(p.color),
					font: font as never,
					maxWidth: mmToPt(p.maxWidthMm),
					alignment: p.align,
				});
			});
		} else if (p.kind === "qr") {
			// White backing (quiet-zone box) guarantees dark-on-light
			// contrast even on tinted stock; the free-area bg must be
			// light (editor warns otherwise).
			const total = p.modules.length + p.quietModules * 2;
			const cellWpt = mmToPt(p.rect.w) / total;
			const baseX = toX(p.rect.x + o.calDxMm);
			const baseYPt = toY(p.rect.y + o.calDyMm, p.rect.h);
			target.drawRectangle({
				x: baseX,
				y: baseYPt,
				width: mmToPt(p.rect.w),
				height: mmToPt(p.rect.h),
				color: rgb(1, 1, 1),
			});
			// Run-length encode each row into horizontal bars and emit
			// as ONE path + fill (per-module rects balloon the file:
			// ~53MB for 500 badges vs ~2-3MB with bars).
			const round2 = (n: number) => Math.round(n * 100) / 100;
			const qrOps = [
				ops.pushGraphicsState(),
				ops.setNonStrokingRGB(0, 0, 0),
			];
			const n = p.modules.length;
			for (let r = 0; r < n; r++) {
				let c = 0;
				while (c < n) {
					if (!p.modules[r]?.[c]) {
						c++;
						continue;
					}
					let run = 1;
					while (c + run < n && p.modules[r]?.[c + run]) run++;
					qrOps.push(
						ops.rectangle(
							round2(baseX + (c + p.quietModules) * cellWpt),
							round2(
								baseYPt +
									(n - 1 - r + p.quietModules) * cellWpt,
							),
							round2(run * cellWpt),
							round2(cellWpt),
						),
					);
					c += run;
				}
			}
			qrOps.push(ops.fill(), ops.popGraphicsState());
			target.drawOperators(qrOps);
		} else if (p.kind === "image") {
			if (o.res.artworkImage && p.url === "__artwork__") {
				target.drawImage(o.res.artworkImage, {
					x: toX(p.rect.x + o.calDxMm),
					y: toY(p.rect.y + o.calDyMm, p.rect.h),
					width: mmToPt(p.rect.w),
					height: mmToPt(p.rect.h),
				});
			}
		}
	}
}

export async function renderBadgesToPdf(
	input: RenderBadgePdfInput,
): Promise<Uint8Array> {
	const pdf = PDF.create();
	if (input.title) pdf.setTitle(input.title);

	const badgeWpt = mmToPt(input.layout.badgeW);
	const badgeHpt = mmToPt(input.layout.badgeH);
	const res = await embedShared(pdf, input);

	for (const primitives of input.badges) {
		const page = pdf.addPage({ width: badgeWpt, height: badgeHpt });
		drawBadgeContent(page, {
			layout: input.layout,
			primitives,
			res,
			badgeWpt,
			badgeHpt,
			originXpt: 0,
			originYpt: 0,
			calDxMm: 0,
			calDyMm: 0,
			artwork:
				input.layout.mode === "full"
					? {
							draw: true,
							xMm: 0,
							yMm: 0,
							wMm: input.layout.badgeW,
							hMm: input.layout.badgeH,
						}
					: { draw: false },
		});
	}

	return (await pdf.save()) as unknown as Uint8Array;
}

/** Crop marks around a trim box (page bottom-up pt coords). */
function drawCropMarks(
	target: ContentTarget,
	trimX: number,
	trimY: number,
	trimW: number,
	trimH: number,
	markLenPt: number,
	markOffPt: number,
): void {
	const corners: { x: number; y: number; sx: number; sy: number }[] = [
		{ x: trimX, y: trimY, sx: -1, sy: -1 },
		{ x: trimX + trimW, y: trimY, sx: 1, sy: -1 },
		{ x: trimX, y: trimY + trimH, sx: -1, sy: 1 },
		{ x: trimX + trimW, y: trimY + trimH, sx: 1, sy: 1 },
	];
	for (const c of corners) {
		target.drawLine({
			start: { x: c.x + c.sx * markOffPt, y: c.y },
			end: { x: c.x + c.sx * (markOffPt + markLenPt), y: c.y },
			thickness: 0.5,
		});
		target.drawLine({
			start: { x: c.x, y: c.y + c.sy * markOffPt },
			end: { x: c.x, y: c.y + c.sy * (markOffPt + markLenPt) },
			thickness: 0.5,
		});
	}
}

/**
 * Render imposed sheets (one imposition engine for both modes).
 * - full: artwork + data per cell (artwork covers trim + bleed).
 * - data-only: data at the free-area position + calibration shift.
 */
export async function renderBadgeSheets(
	input: SheetRenderInput,
): Promise<Uint8Array> {
	const pages = planSheets({
		layout: input.layout,
		badgeCount: input.badges.length,
		testPrint: input.testPrint,
		markLengthMm: input.markLengthMm,
		markOffsetMm: input.markOffsetMm,
	});
	const pdf = PDF.create();
	if (input.title) pdf.setTitle(input.title);
	const res = await embedShared(pdf, input);

	const badgeWpt = mmToPt(input.layout.badgeW);
	const badgeHpt = mmToPt(input.layout.badgeH);
	const bleed = input.layout.page.bleedMm;
	const markLenPt = mmToPt(input.markLengthMm ?? 3);
	const markOffPt = mmToPt(input.markOffsetMm ?? 1);
	const showMarks = input.layout.page.cropMarks;

	for (const sheet of pages) {
		const pageWpt = mmToPt(sheet.pageWMm);
		const pageHpt = mmToPt(sheet.pageHMm);
		const page = pdf.addPage({ width: pageWpt, height: pageHpt });
		const toPageY = (yMm: number, hMm: number) =>
			pageHpt - mmToPt(yMm + hMm);

		for (const cell of sheet.cells) {
			const trimX = mmToPt(cell.trimXMm);
			const trimY = toPageY(cell.trimYMm, cell.trimHMm);
			const trimW = mmToPt(cell.trimWMm);
			const trimH = mmToPt(cell.trimHMm);

			if (showMarks) {
				drawCropMarks(
					page,
					trimX,
					trimY,
					trimW,
					trimH,
					markLenPt,
					markOffPt,
				);
			}
			if (input.testPrint === "outlines") {
				page.drawRectangle({
					x: trimX,
					y: trimY,
					width: trimW,
					height: trimH,
					borderColor: rgb(0, 0, 0),
					borderWidth: 0.5,
				});
				continue;
			}

			const primitives = input.badges[cell.badgeIndex];
			if (!primitives) {
				throw new Error("Crachá ausente para a célula da folha.");
			}
			const dataOnly = input.layout.mode === "data-only";
			const base = {
				layout: input.layout,
				primitives,
				res,
				badgeWpt,
				badgeHpt,
				calDxMm: dataOnly ? cell.dxMm : 0,
				calDyMm: dataOnly ? cell.dyMm : 0,
				artwork: (dataOnly
					? { draw: false }
					: {
							draw: true,
							xMm: -bleed,
							yMm: -bleed,
							wMm: input.layout.badgeW + bleed * 2,
							hMm: input.layout.badgeH + bleed * 2,
						}) as BadgeContentOptions["artwork"],
			};

			if (!cell.rotated) {
				drawBadgeContent(page, {
					...base,
					originXpt: trimX,
					originYpt: trimY,
				});
			} else {
				// 90° rotation via CTM: badge-local (x,y) → page
				// (e - y, f + x). Badge bottom edge lands on the trim
				// right edge; content draws in badge-local space.
				const e = trimX + trimW;
				const f = trimY;
				page.drawOperators([
					ops.pushGraphicsState(),
					ops.concatMatrix(0, 1, -1, 0, e, f),
				]);
				drawBadgeContent(page, { ...base, originXpt: 0, originYpt: 0 });
				page.drawOperators([ops.popGraphicsState()]);
			}
		}
	}

	return (await pdf.save()) as unknown as Uint8Array;
}
