import { describe, expect, it } from "vitest";

import { planBatchFiles } from "./batch";
import { badgeLayoutSchema, defaultBadgeItems } from "./schema";
import { planSheets } from "./sheet";

function layout(overrides: Record<string, unknown> = {}) {
	return badgeLayoutSchema.parse({
		mode: "data-only",
		badgeW: 90,
		badgeH: 55,
		freeArea: { x: 5, y: 5, w: 80, h: 45, radius: 3, padding: 3 },
		items: defaultBadgeItems(),
		...overrides,
	});
}

describe("planSheets", () => {
	it("chunks badges across A4 pages (8 per page)", () => {
		const pages = planSheets({ layout: layout(), badgeCount: 10 });
		expect(pages).toHaveLength(2);
		expect(pages[0]?.cells).toHaveLength(8);
		expect(pages[1]?.cells).toHaveLength(2);
		expect(pages[0]?.cols).toBe(2);
		expect(pages[0]?.rows).toBe(4);
		expect(pages[0]?.rotated).toBe(false);
	});

	it("keeps every cell inside page margins", () => {
		const pages = planSheets({ layout: layout(), badgeCount: 8 });
		const sheet = pages[0];
		if (!sheet) throw new Error("expected a page");
		expect(sheet.pageWMm).toBe(210);
		expect(sheet.pageHMm).toBe(297);
		for (const c of sheet.cells) {
			expect(c.xMm).toBeGreaterThanOrEqual(10 - 1e-9);
			expect(c.yMm).toBeGreaterThanOrEqual(10 - 1e-9);
			expect(c.xMm + 90).toBeLessThanOrEqual(210 - 10 + 1e-9);
			expect(c.yMm + 55).toBeLessThanOrEqual(297 - 10 + 1e-9);
			expect(c.trimWMm).toBeCloseTo(90, 9);
			expect(c.trimHMm).toBeCloseTo(55, 9);
		}
	});

	it("rotates cells when that fits more", () => {
		const pages = planSheets({
			layout: layout({ badgeW: 120, badgeH: 40 }),
			badgeCount: 8,
		});
		const sheet = pages[0];
		if (!sheet) throw new Error("expected a page");
		expect(sheet.rotated).toBe(true);
		expect(sheet.cells[0]?.rotated).toBe(true);
		// Trim is the badge box in oriented space.
		expect(sheet.cells[0]?.trimWMm).toBeCloseTo(40, 9);
		expect(sheet.cells[0]?.trimHMm).toBeCloseTo(120, 9);
	});

	it("carries the calibration offset per cell", () => {
		const pages = planSheets({
			layout: layout({ calibration: { dx: 1.5, dy: -0.5 } }),
			badgeCount: 1,
		});
		expect(pages[0]?.cells[0]?.dxMm).toBe(1.5);
		expect(pages[0]?.cells[0]?.dyMm).toBe(-0.5);
	});

	it("supports a manual grid and rejects out-of-bounds grids", () => {
		const pages = planSheets({
			layout: layout({
				manualGrid: {
					enabled: true,
					cols: 2,
					rows: 2,
					originX: 10,
					originY: 10,
				},
			}),
			badgeCount: 4,
		});
		expect(pages).toHaveLength(1);
		expect(pages[0]?.cells).toHaveLength(4);
		expect(() =>
			planSheets({
				layout: layout({
					manualGrid: {
						enabled: true,
						cols: 3,
						rows: 4,
						originX: 10,
						originY: 10,
					},
				}),
				badgeCount: 1,
			}),
		).toThrow(/Grade manual inválida/);
	});

	it("rejects empty selections and oversized badges with clear errors", () => {
		expect(() => planSheets({ layout: layout(), badgeCount: 0 })).toThrow(
			/Nenhum participante selecionado/,
		);
		expect(() =>
			planSheets({
				layout: layout({ badgeW: 500, badgeH: 500 }),
				badgeCount: 1,
			}),
		).toThrow(/não cabe na página/);
	});

	it("plans single and outlines test prints", () => {
		const single = planSheets({
			layout: layout(),
			badgeCount: 10,
			testPrint: "single",
		});
		expect(single).toHaveLength(1);
		expect(single[0]?.cells).toHaveLength(1);

		const outlines = planSheets({
			layout: layout(),
			badgeCount: 10,
			testPrint: "outlines",
		});
		expect(outlines).toHaveLength(1);
		expect(outlines[0]?.cells).toHaveLength(8);
	});
});

describe("planBatchFiles", () => {
	it("splits above the per-file threshold", () => {
		expect(planBatchFiles(0)).toEqual([]);
		expect(planBatchFiles(500)).toEqual([
			{ fileIndex: 0, start: 0, count: 500 },
		]);
		expect(planBatchFiles(1200, 500)).toEqual([
			{ fileIndex: 0, start: 0, count: 500 },
			{ fileIndex: 1, start: 500, count: 500 },
			{ fileIndex: 2, start: 1000, count: 200 },
		]);
	});

	it("rejects invalid inputs", () => {
		expect(() => planBatchFiles(-1)).toThrow();
		expect(() => planBatchFiles(10, 0)).toThrow();
	});
});
