import { z } from "@verific/zod";

import { mmToPt } from "./units";

export type PageSizeName = "a4" | "letter";

export const PAGE_SIZES_MM: Record<PageSizeName, { w: number; h: number }> = {
	a4: { w: 210, h: 297 },
	letter: { w: 215.9, h: 279.4 },
};

export interface ImpositionInput {
	/** Badge cell size in mm (must already include bleed). */
	badgeW: number;
	badgeH: number;
	pageW: number;
	pageH: number;
	marginMm: number;
	gutterMm: number;
	/** Length of crop marks in mm (must fit in gutter). */
	markLengthMm: number;
	markOffsetMm: number;
}

export interface ImpositionResult {
	cols: number;
	rows: number;
	perPage: number;
	rotated: boolean;
	/** Used badge w/h after optional rotation. */
	usedW: number;
	usedH: number;
	wastedPct: number;
	/** Origin offset (top-left of first cell) in mm. */
	originX: number;
	originY: number;
	gutterOk: boolean;
	gutterWarning: string | null;
}

function fit(
	badgeW: number,
	badgeH: number,
	pageW: number,
	pageH: number,
	marginMm: number,
	gutterMm: number,
): { cols: number; rows: number } {
	const availW = pageW - marginMm * 2;
	const availH = pageH - marginMm * 2;
	if (availW <= 0 || availH <= 0 || badgeW <= 0 || badgeH <= 0) {
		return { cols: 0, rows: 0 };
	}
	const cols = Math.floor((availW + gutterMm) / (badgeW + gutterMm));
	const rows = Math.floor((availH + gutterMm) / (badgeH + gutterMm));
	return { cols: Math.max(cols, 0), rows: Math.max(rows, 0) };
}

/**
 * Fit the maximum number of badges per page, trying both orientations.
 * Cell size must include bleed; crop marks live in the gutter.
 */
export function computeImposition(input: ImpositionInput): ImpositionResult {
	const { badgeW, badgeH, pageW, pageH, marginMm, gutterMm } = input;
	const normal = fit(badgeW, badgeH, pageW, pageH, marginMm, gutterMm);
	const rotatedFit = fit(badgeH, badgeW, pageW, pageH, marginMm, gutterMm);
	const normalCount = normal.cols * normal.rows;
	const rotatedCount = rotatedFit.cols * rotatedFit.rows;
	const rotated = rotatedCount > normalCount;
	const cols = rotated ? rotatedFit.cols : normal.cols;
	const rows = rotated ? rotatedFit.rows : normal.rows;
	const usedW = rotated ? badgeH : badgeW;
	const usedH = rotated ? badgeW : badgeH;
	const perPage = cols * rows;
	const pageArea = pageW * pageH;
	const usedArea = perPage * usedW * usedH;
	const wastedPct =
		pageArea > 0
			? Math.round(((pageArea - usedArea) / pageArea) * 1000) / 10
			: 100;

	const gridW = cols > 0 ? cols * usedW + (cols - 1) * gutterMm : 0;
	const gridH = rows > 0 ? rows * usedH + (rows - 1) * gutterMm : 0;
	const originX = (pageW - gridW) / 2;
	const originY = (pageH - gridH) / 2;

	const gutterOk = gutterMm >= input.markLengthMm + input.markOffsetMm;
	return {
		cols,
		rows,
		perPage,
		rotated,
		usedW,
		usedH,
		wastedPct,
		originX: Math.round(originX * 100) / 100,
		originY: Math.round(originY * 100) / 100,
		gutterOk,
		gutterWarning: gutterOk
			? null
			: "Medianiz (gutter) menor que marca + deslocamento — marcas podem invadir o crachá.",
	};
}

/** Cell top-left positions in mm (top-left origin), row-major. */
export function cellPositions(
	result: Pick<
		ImpositionResult,
		"cols" | "rows" | "usedW" | "usedH" | "originX" | "originY"
	>,
	gutterMm: number,
): { x: number; y: number }[] {
	const out: { x: number; y: number }[] = [];
	for (let r = 0; r < result.rows; r++) {
		for (let c = 0; c < result.cols; c++) {
			out.push({
				x: result.originX + c * (result.usedW + gutterMm),
				y: result.originY + r * (result.usedH + gutterMm),
			});
		}
	}
	return out;
}

/** Validate a manual grid against page bounds. Returns errors (empty = ok). */
export function validateManualGrid(input: {
	cols: number;
	rows: number;
	badgeW: number;
	badgeH: number;
	pageW: number;
	pageH: number;
	marginMm: number;
	gutterMm: number;
	originX: number;
	originY: number;
}): string[] {
	const errors: string[] = [];
	if (!Number.isInteger(input.cols) || input.cols < 1) {
		errors.push("Colunas deve ser inteiro ≥ 1.");
	}
	if (!Number.isInteger(input.rows) || input.rows < 1) {
		errors.push("Linhas deve ser inteiro ≥ 1.");
	}
	if (errors.length > 0) return errors;
	const gridW = input.cols * input.badgeW + (input.cols - 1) * input.gutterMm;
	const gridH = input.rows * input.badgeH + (input.rows - 1) * input.gutterMm;
	if (input.originX < input.marginMm - 1e-9) {
		errors.push("Origem X dentro da margem.");
	}
	if (input.originY < input.marginMm - 1e-9) {
		errors.push("Origem Y dentro da margem.");
	}
	if (input.originX + gridW > input.pageW - input.marginMm + 1e-9) {
		errors.push("Grade excede a largura útil da página.");
	}
	if (input.originY + gridH > input.pageH - input.marginMm + 1e-9) {
		errors.push("Grade excede a altura útil da página.");
	}
	return errors;
}

export const impositionInputSchema = z.object({
	badgeW: z.number().positive(),
	badgeH: z.number().positive(),
	pageW: z.number().positive(),
	pageH: z.number().positive(),
	marginMm: z.number().min(0),
	gutterMm: z.number().min(0),
	markLengthMm: z.number().min(0).default(3),
	markOffsetMm: z.number().min(0).default(1),
});

/** Helper: badge mm → PDF points size tuple. */
export function badgeSizePt(badgeWmm: number, badgeHmm: number) {
	return { w: mmToPt(badgeWmm), h: mmToPt(badgeHmm) };
}
