import {
	PAGE_SIZES_MM,
	cellPositions,
	computeImposition,
	validateManualGrid,
} from "./imposition";

import type { BadgeLayout } from "./schema";

/** One badge cell on a sheet (all mm, page top-left origin). */
export interface SheetCell {
	badgeIndex: number;
	/** Cell top-left (includes bleed margin around the trim box). */
	xMm: number;
	yMm: number;
	/** Trim box top-left (badge-size box inside the cell). */
	trimXMm: number;
	trimYMm: number;
	trimWMm: number;
	trimHMm: number;
	/** Content placement is rotated 90° inside the cell. */
	rotated: boolean;
	/** Calibration shift applied to data (data-only mode). */
	dxMm: number;
	dyMm: number;
}

export interface SheetPage {
	pageWMm: number;
	pageHMm: number;
	cols: number;
	rows: number;
	rotated: boolean;
	wastedPct: number;
	gutterWarning: string | null;
	cells: SheetCell[];
}

export type TestPrint = "single" | "outlines";

export interface PlanSheetsInput {
	layout: BadgeLayout;
	badgeCount: number;
	/** Single-badge proof or outlines-only alignment sheet. */
	testPrint?: TestPrint | null;
	markLengthMm?: number;
	markOffsetMm?: number;
}

function pageSizeMm(layout: BadgeLayout): { w: number; h: number } {
	if (layout.page.size === "custom") {
		const w = layout.page.customW ?? 210;
		const h = layout.page.customH ?? 297;
		return { w, h };
	}
	return PAGE_SIZES_MM[layout.page.size];
}

/**
 * Plan sheets for a batch: pure geometry, no PDF. Cell size includes
 * bleed; crop marks live in the gutter. Throws on invalid configuration
 * with a message safe to show to the organizer.
 */
export function planSheets(input: PlanSheetsInput): SheetPage[] {
	const { layout } = input;
	if (input.badgeCount < 0 || !Number.isInteger(input.badgeCount)) {
		throw new Error("Quantidade de crachás inválida.");
	}
	const page = pageSizeMm(layout);
	const bleed = layout.page.bleedMm;
	const markLength = input.markLengthMm ?? 3;
	const markOffset = input.markOffsetMm ?? 1;

	// In data-only mode we print only the available (free) area, not the
	// whole badge.
	const printW =
		layout.mode === "data-only" ? layout.freeArea.w : layout.badgeW;
	const printH =
		layout.mode === "data-only" ? layout.freeArea.h : layout.badgeH;

	const cellW = printW + bleed * 2;
	const cellH = printH + bleed * 2;

	let cols: number;
	let rows: number;
	let rotated: boolean;
	let wastedPct: number;
	let gutterWarning: string | null;
	let originX: number;
	let originY: number;
	/** Oriented cell size (includes bleed; swapped when rotated). */
	let cellUsedW: number;
	let cellUsedH: number;

	if (layout.manualGrid.enabled) {
		const g = layout.manualGrid;
		const errors = validateManualGrid({
			cols: g.cols,
			rows: g.rows,
			badgeW: cellW,
			badgeH: cellH,
			pageW: page.w,
			pageH: page.h,
			marginMm: layout.page.marginMm,
			gutterMm: layout.page.gutterMm,
			originX: g.originX,
			originY: g.originY,
		});
		if (errors.length > 0) {
			throw new Error(`Grade manual inválida: ${errors.join(" ")}`);
		}
		cols = g.cols;
		rows = g.rows;
		rotated = false;
		cellUsedW = cellW;
		cellUsedH = cellH;
		originX = g.originX;
		originY = g.originY;
		const usedArea = cols * rows * printW * printH;
		wastedPct =
			Math.round(
				((page.w * page.h - usedArea) / (page.w * page.h)) * 1000,
			) / 10;
		gutterWarning =
			layout.page.gutterMm >= markLength + markOffset
				? null
				: "Medianiz (gutter) menor que marca + deslocamento — marcas podem invadir o crachá.";
	} else {
		const fit = computeImposition({
			badgeW: cellW,
			badgeH: cellH,
			pageW: page.w,
			pageH: page.h,
			marginMm: layout.page.marginMm,
			gutterMm: layout.page.gutterMm,
			markLengthMm: markLength,
			markOffsetMm: markOffset,
		});
		if (fit.perPage === 0) {
			throw new Error(
				"O crachá não cabe na página com estas margens — reduza as margens ou o tamanho do crachá.",
			);
		}
		cols = fit.cols;
		rows = fit.rows;
		rotated = fit.rotated;
		wastedPct = fit.wastedPct;
		gutterWarning = fit.gutterWarning;
		originX = fit.originX;
		originY = fit.originY;
		cellUsedW = fit.usedW;
		cellUsedH = fit.usedH;
	}

	// Trim box = oriented cell minus bleed on each side.
	const trimW = cellUsedW - bleed * 2;
	const trimH = cellUsedH - bleed * 2;

	const positions = cellPositions(
		{ cols, rows, usedW: cellUsedW, usedH: cellUsedH, originX, originY },
		layout.page.gutterMm,
	);
	const perPage = cols * rows;

	const makeCell = (badgeIndex: number, pos: number): SheetCell => {
		const p = positions[pos];
		if (!p) throw new Error("Posição de célula inexistente.");
		return {
			badgeIndex,
			xMm: p.x,
			yMm: p.y,
			trimXMm: p.x + bleed,
			trimYMm: p.y + bleed,
			trimWMm: trimW,
			trimHMm: trimH,
			rotated,
			dxMm: layout.calibration.dx,
			dyMm: layout.calibration.dy,
		};
	};

	const pages: SheetPage[] = [];
	const basePage = {
		pageWMm: page.w,
		pageHMm: page.h,
		cols,
		rows,
		rotated,
		wastedPct,
		gutterWarning,
	};

	if (input.testPrint === "single") {
		if (input.badgeCount === 0) {
			throw new Error("Nenhum participante selecionado para impressão.");
		}
		return [{ ...basePage, cols: 1, rows: 1, cells: [makeCell(0, 0)] }];
	}

	if (input.testPrint === "outlines") {
		// Alignment sheet: full grid of empty trim boxes, no content.
		const cells: SheetCell[] = [];
		for (let i = 0; i < perPage; i++) {
			cells.push(makeCell(i, i));
		}
		return [{ ...basePage, cells }];
	}

	if (input.badgeCount === 0) {
		throw new Error("Nenhum participante selecionado para impressão.");
	}
	const totalCells = input.badgeCount;
	for (let start = 0; start < totalCells; start += perPage) {
		const cells: SheetCell[] = [];
		for (let i = 0; i < perPage && start + i < totalCells; i++) {
			cells.push(makeCell(start + i, i));
		}
		pages.push({ ...basePage, cells });
	}
	return pages;
}
