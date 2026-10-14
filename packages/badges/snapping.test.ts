import { describe, expect, it } from "vitest";

import { snapRect } from "./snapping";

const FREE = { x: 0, y: 0, w: 100, h: 60 };

describe("snapping", () => {
	it("snaps to grid when enabled", () => {
		const { rect, guides } = snapRect(
			{ x: 12.3, y: 7.8, w: 10, h: 10 },
			[],
			FREE,
			{
				gridSizeMm: 5,
				gridOn: true,
				toleranceMm: 2,
				snapToItems: false,
				snapToFreeArea: false,
			},
		);
		expect(rect.x).toBe(10);
		expect(rect.y).toBe(10);
		expect(guides).toEqual([]);
	});

	it("leaves position alone when grid is off and nothing is near", () => {
		const { rect } = snapRect(
			{ x: 12.3, y: 7.8, w: 10, h: 10 },
			[{ x: 80, y: 40, w: 10, h: 10 }],
			FREE,
			{
				gridSizeMm: 5,
				gridOn: false,
				toleranceMm: 1,
				snapToItems: true,
				snapToFreeArea: true,
			},
		);
		expect(rect.x).toBeCloseTo(12.3, 9);
	});

	it("snaps edges to other items and emits guides", () => {
		const { rect, guides } = snapRect(
			{ x: 29.5, y: 10, w: 10, h: 10 },
			[{ x: 10, y: 10, w: 20, h: 10 }],
			FREE,
			{
				gridSizeMm: 5,
				gridOn: false,
				toleranceMm: 2,
				snapToItems: true,
				snapToFreeArea: false,
			},
		);
		// Right edge (39.5) snaps to item right edge (30)? No — left edge
		// 29.5 snaps to 30 (within tolerance).
		expect(rect.x).toBe(30);
		expect(guides).toContainEqual({ axis: "v", position: 30 });
	});

	it("snaps to free-area center", () => {
		const { rect, guides } = snapRect(
			{ x: 44, y: 10, w: 10, h: 10 },
			[],
			FREE,
			{
				gridSizeMm: 5,
				gridOn: false,
				toleranceMm: 2,
				snapToItems: false,
				snapToFreeArea: true,
			},
		);
		// Center-x 49 → free-area center 50.
		expect(rect.x).toBe(45);
		expect(guides).toContainEqual({ axis: "v", position: 50 });
	});
});
