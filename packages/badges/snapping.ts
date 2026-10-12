import type { Rect } from "./coords";

export interface SnapOptions {
	/** Snap step in mm when grid snapping is on. */
	gridSizeMm: number;
	gridOn: boolean;
	/** Tolerance in mm for edge/center snapping. */
	toleranceMm: number;
	snapToItems: boolean;
	snapToFreeArea: boolean;
}

export interface Guide {
	/** "v" = vertical line at x, "h" = horizontal line at y. */
	axis: "v" | "h";
	position: number;
}

/**
 * Snap a dragged point/size to grid, item edges/centers and free-area
 * edges/center. Returns the snapped rect plus active alignment guides.
 * Pure function — no DOM.
 */
export function snapRect(
	moving: Rect,
	others: Rect[],
	freeArea: Rect,
	options: SnapOptions,
): { rect: Rect; guides: Guide[] } {
	const guides: Guide[] = [];
	let { x, y } = moving;
	const tol = Math.max(options.toleranceMm, 0);

	const snapValue = (value: number, targets: number[]): number => {
		let best = value;
		let bestDist = tol;
		for (const t of targets) {
			const d = Math.abs(value - t);
			if (d <= bestDist) {
				bestDist = d;
				best = t;
			}
		}
		return best;
	};

	if (options.gridOn && options.gridSizeMm > 0) {
		const g = options.gridSizeMm;
		x = Math.round(x / g) * g;
		y = Math.round(y / g) * g;
	}

	const vTargets: number[] = [];
	const hTargets: number[] = [];
	if (options.snapToItems) {
		for (const o of others) {
			vTargets.push(o.x, o.x + o.w / 2, o.x + o.w);
			hTargets.push(o.y, o.y + o.h / 2, o.y + o.h);
		}
	}
	if (options.snapToFreeArea) {
		vTargets.push(
			freeArea.x,
			freeArea.x + freeArea.w / 2,
			freeArea.x + freeArea.w,
		);
		hTargets.push(
			freeArea.y,
			freeArea.y + freeArea.h / 2,
			freeArea.y + freeArea.h,
		);
	}

	// Snap left edge, center-x and right edge; prefer closest.
	const cx = x + moving.w / 2;
	const rx = x + moving.w;
	const snappedX = snapValue(x, vTargets);
	const snappedCx = snapValue(cx, vTargets);
	const snappedRx = snapValue(rx, vTargets);
	const dxLeft = snappedX - x;
	const dxC = snappedCx - cx;
	const dxR = snappedRx - rx;
	const candidates = [
		{ d: dxLeft, ok: snappedX !== x },
		{ d: dxC, ok: snappedCx !== cx },
		{ d: dxR, ok: snappedRx !== rx },
	].filter((c) => c.ok);
	if (candidates.length > 0) {
		const best = candidates.reduce((a, b) =>
			Math.abs(a.d) <= Math.abs(b.d) ? a : b,
		);
		x += best.d;
		const guideX =
			x +
			(best.d === dxLeft ? 0 : best.d === dxC ? moving.w / 2 : moving.w);
		guides.push({ axis: "v", position: guideX });
	}

	const cy = y + moving.h / 2;
	const by = y + moving.h;
	const snappedY = snapValue(y, hTargets);
	const snappedCy = snapValue(cy, hTargets);
	const snappedBy = snapValue(by, hTargets);
	const dyTop = snappedY - y;
	const dyC = snappedCy - cy;
	const dyB = snappedBy - by;
	const vCandidates = [
		{ d: dyTop, ok: snappedY !== y },
		{ d: dyC, ok: snappedCy !== cy },
		{ d: dyB, ok: snappedBy !== by },
	].filter((c) => c.ok);
	if (vCandidates.length > 0) {
		const best = vCandidates.reduce((a, b) =>
			Math.abs(a.d) <= Math.abs(b.d) ? a : b,
		);
		y += best.d;
		const guideY =
			y +
			(best.d === dyTop ? 0 : best.d === dyC ? moving.h / 2 : moving.h);
		guides.push({ axis: "h", position: guideY });
	}

	return { rect: { ...moving, x, y }, guides };
}
