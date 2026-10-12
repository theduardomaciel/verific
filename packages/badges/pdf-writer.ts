/**
 * Internal adapter over `@libpdf/core` (pinned exact, beta). The rest of
 * the code must not import LibPDF directly — only through this module.
 * RGB only (no CMYK/ICC) — known limitation, documented for review.
 */
import { PDF, ops, rgb } from "@libpdf/core";

import { mmToPt } from "./units";

import type { DisplayPrimitive } from "./display-list";
import type { BadgeLayout } from "./schema";

export interface PdfWriterFonts {
	/** family@weight → embedded font ref (opaque to callers). */
	get(family: string, weight: number): unknown;
}

export interface RenderBadgePdfInput {
	layout: BadgeLayout;
	/** One display list per badge (already built via buildDisplayList). */
	badges: DisplayPrimitive[][];
	/** Resolve embedded font bytes per family+weight. */
	fontBytes: Map<string, Uint8Array>;
	/** Artwork bytes (PNG/JPEG, or rasterized SVG/PDF preview). */
	artworkBytes: Uint8Array | null;
	artworkMime: "png" | "jpeg" | null;
	/** PDF artwork page bytes when LibPDF embedPage is used. */
	artworkPdfBytes: Uint8Array | null;
	title?: string;
}

function hexToRgb(hex: string) {
	const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
	const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
	const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
	return rgb(r, g, b);
}

export async function renderBadgesToPdf(
	input: RenderBadgePdfInput,
): Promise<Uint8Array> {
	const pdf = PDF.create();
	if (input.title) pdf.setTitle(input.title);

	const badgeWpt = mmToPt(input.layout.badgeW);
	const badgeHpt = mmToPt(input.layout.badgeH);

	// Embed fonts once (subset automatically on save).
	const embedded = new Map<string, ReturnType<typeof pdf.embedFont>>();
	for (const [key, bytes] of input.fontBytes) {
		embedded.set(key, pdf.embedFont(bytes as unknown as Uint8Array));
	}

	// Embed artwork ONCE, reuse for every badge.
	let artworkImage: ReturnType<typeof pdf.embedPng> | null = null;
	if (input.artworkBytes && input.artworkMime) {
		artworkImage =
			input.artworkMime === "png"
				? pdf.embedPng(input.artworkBytes as unknown as Uint8Array)
				: pdf.embedJpeg(input.artworkBytes as unknown as Uint8Array);
	}
	let artworkPage: Awaited<ReturnType<typeof pdf.embedPage>> | null = null;
	if (input.artworkPdfBytes) {
		const src = await PDF.load(
			input.artworkPdfBytes as unknown as Uint8Array,
		);
		artworkPage = await pdf.embedPage(src, 0);
	}

	const fontKey = (family: string, weight: number) =>
		`${family.trim().toLowerCase()}@${weight}`;

	for (const primitives of input.badges) {
		const page = pdf.addPage({ width: badgeWpt, height: badgeHpt });
		const topLeftToPdfY = (yMm: number, hMm: number) =>
			badgeHpt - mmToPt(yMm + hMm);

		// Full-badge mode: artwork first (background).
		if (input.layout.mode === "full") {
			if (artworkPage) {
				page.drawPage(artworkPage, {
					x: 0,
					y: 0,
					width: badgeWpt,
					height: badgeHpt,
				});
			} else if (artworkImage) {
				page.drawImage(artworkImage, {
					x: 0,
					y: 0,
					width: badgeWpt,
					height: badgeHpt,
				});
			}
		}

		for (const p of primitives) {
			if (p.kind === "rect") {
				page.drawRectangle({
					x: mmToPt(p.rect.x),
					y: topLeftToPdfY(p.rect.y, p.rect.h),
					width: mmToPt(p.rect.w),
					height: mmToPt(p.rect.h),
					color: hexToRgb(p.fill),
					cornerRadius: mmToPt(p.radiusMm),
				});
			} else if (p.kind === "text") {
				const font =
					embedded.get(fontKey(p.fontRole, p.weight)) ??
					embedded.get(
						[...embedded.keys()].find((k) =>
							k.endsWith(`@${p.weight}`),
						) ?? "",
					);
				// Caller must supply exact family@weight; missing = skip (spike asserts).
				const text = p.lines.join("\n");
				page.drawText(text, {
					x: mmToPt(p.xMm),
					y: topLeftToPdfY(
						p.yMm,
						p.lineHeightPt * p.lines.length * 0.3527777778,
					),
					size: p.fontSizePt,
					color: hexToRgb(p.color),
					font: (font as never) ?? undefined,
					lineHeight: p.lineHeightPt,
					maxWidth: mmToPt(p.maxWidthMm),
					alignment: p.align,
				});
			} else if (p.kind === "qr") {
				// White backing (quiet-zone box) guarantees dark-on-light
				// contrast even on tinted stock; the free-area bg must be
				// light (editor warns otherwise).
				const total = p.modules.length + p.quietModules * 2;
				const cellWpt = mmToPt(p.rect.w) / total;
				const baseX = mmToPt(p.rect.x);
				const baseYPt = topLeftToPdfY(p.rect.y, p.rect.h);
				page.drawRectangle({
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
				page.drawOperators(qrOps);
			} else if (p.kind === "image") {
				if (artworkImage && p.url === "__artwork__") {
					page.drawImage(artworkImage, {
						x: mmToPt(p.rect.x),
						y: topLeftToPdfY(p.rect.y, p.rect.h),
						width: mmToPt(p.rect.w),
						height: mmToPt(p.rect.h),
					});
				}
			}
		}
	}

	return (await pdf.save()) as unknown as Uint8Array;
}
