import { describe, expect, it } from "vitest";

import { badgeToRelative, clampToFreeArea, relativeToBadge } from "./coords";

const FREE = { x: 5, y: 5, w: 80, h: 45, radius: 3, padding: 3 };

describe("coords", () => {
	it("maps relative rect to badge coordinates", () => {
		expect(
			relativeToBadge({ x: 0.1, y: 0.1, w: 0.8, h: 0.5 }, FREE),
		).toEqual({ x: 13, y: 9.5, w: 64, h: 22.5 });
	});

	it("round-trips badge to relative", () => {
		const abs = { x: 13, y: 9.5, w: 64, h: 22.5 };
		const rel = badgeToRelative(abs, FREE);
		expect(rel.x).toBeCloseTo(0.1, 9);
		expect(rel.y).toBeCloseTo(0.1, 9);
		expect(relativeToBadge(rel, FREE)).toEqual(abs);
	});

	it("adapts proportionally when the free area moves/resizes", () => {
		const rel = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 };
		const before = relativeToBadge(rel, FREE);
		const moved = { ...FREE, x: 10, w: 40 };
		const after = relativeToBadge(rel, moved);
		// Same relative position, different absolute box.
		expect(after.x).toBeCloseTo(20, 9);
		expect(after.w).toBeCloseTo(20, 9);
		expect(before.w).toBeCloseTo(40, 9);
	});

	it("clamps rects inside the padded free area", () => {
		const clamped = clampToFreeArea({ x: 0, y: 0, w: 200, h: 200 }, FREE);
		expect(clamped.x).toBe(FREE.x + FREE.padding);
		expect(clamped.y).toBe(FREE.y + FREE.padding);
		expect(clamped.x + clamped.w).toBeLessThanOrEqual(
			FREE.x + FREE.w - FREE.padding + 1e-9,
		);
	});

	it("rejects degenerate free areas", () => {
		expect(() =>
			badgeToRelative({ x: 0, y: 0, w: 1, h: 1 }, { ...FREE, w: 0 }),
		).toThrow();
	});
});
