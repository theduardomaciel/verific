import { describe, expect, it } from "vitest";

import {
	cellPositions,
	computeImposition,
	validateManualGrid,
} from "./imposition";

describe("imposition", () => {
	it("fits the maximum badges on A4 (90x55mm)", () => {
		const result = computeImposition({
			badgeW: 90,
			badgeH: 55,
			pageW: 210,
			pageH: 297,
			marginMm: 10,
			gutterMm: 5,
			markLengthMm: 3,
			markOffsetMm: 1,
		});
		// Normal: cols floor((190+5)/95)=2, rows floor((277+5)/60)=4 → 8.
		// Rotated (55x90): cols floor(195/60)=3, rows floor(282/95)=2 → 6.
		expect(result.rotated).toBe(false);
		expect(result.cols).toBe(2);
		expect(result.rows).toBe(4);
		expect(result.perPage).toBe(8);
		expect(result.gutterOk).toBe(true);
	});

	it("rotates the badge when that fits more", () => {
		const result = computeImposition({
			badgeW: 120,
			badgeH: 40,
			pageW: 210,
			pageH: 297,
			marginMm: 10,
			gutterMm: 5,
			markLengthMm: 3,
			markOffsetMm: 1,
		});
		// Normal: cols 1, rows 6 → 6. Rotated (40x120): cols 4, rows 2 → 8.
		expect(result.rotated).toBe(true);
		expect(result.perPage).toBe(8);
	});

	it("warns when the gutter cannot hold crop marks", () => {
		const result = computeImposition({
			badgeW: 90,
			badgeH: 55,
			pageW: 210,
			pageH: 297,
			marginMm: 10,
			gutterMm: 2,
			markLengthMm: 3,
			markOffsetMm: 1,
		});
		expect(result.gutterOk).toBe(false);
		expect(result.gutterWarning).toContain("Medianiz");
	});

	it("lays out cell positions inside margins", () => {
		const result = computeImposition({
			badgeW: 90,
			badgeH: 55,
			pageW: 210,
			pageH: 297,
			marginMm: 10,
			gutterMm: 5,
			markLengthMm: 3,
			markOffsetMm: 1,
		});
		const cells = cellPositions(result, 5);
		expect(cells).toHaveLength(8);
		for (const c of cells) {
			expect(c.x).toBeGreaterThanOrEqual(10 - 1e-9);
			expect(c.y).toBeGreaterThanOrEqual(10 - 1e-9);
			expect(c.x + 90).toBeLessThanOrEqual(210 - 10 + 1e-9);
			expect(c.y + 55).toBeLessThanOrEqual(297 - 10 + 1e-9);
		}
	});

	it("validates manual grids against page bounds", () => {
		expect(
			validateManualGrid({
				cols: 2,
				rows: 4,
				badgeW: 90,
				badgeH: 55,
				pageW: 210,
				pageH: 297,
				marginMm: 10,
				gutterMm: 5,
				originX: 15,
				originY: 28.5,
			}),
		).toEqual([]);
		expect(
			validateManualGrid({
				cols: 0,
				rows: 4,
				badgeW: 90,
				badgeH: 55,
				pageW: 210,
				pageH: 297,
				marginMm: 10,
				gutterMm: 5,
				originX: 10,
				originY: 10,
			}),
		).toContain("Colunas deve ser inteiro ≥ 1.");
		expect(
			validateManualGrid({
				cols: 3,
				rows: 4,
				badgeW: 90,
				badgeH: 55,
				pageW: 210,
				pageH: 297,
				marginMm: 10,
				gutterMm: 5,
				originX: 10,
				originY: 10,
			}),
		).toContain("Grade excede a largura útil da página.");
	});
});
