/** Axis-aligned rect in canonical mm, origin top-left of its parent. */

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** Free area in badge coordinates (mm, top-left origin). */
export interface FreeArea extends Rect {
	/** Corner radius in mm. */
	radius: number;
	/** Inner padding in mm (respects corner radius). */
	padding: number;
}

/**
 * Convert a rect stored relative to the free area (0..1) to badge
 * coordinates (mm). Content adapts proportionally when the free area
 * moves or resizes.
 */
export function relativeToBadge(rel: Rect, free: FreeArea): Rect {
	return {
		x: free.x + rel.x * free.w,
		y: free.y + rel.y * free.h,
		w: rel.w * free.w,
		h: rel.h * free.h,
	};
}

/** Inverse of {@link relativeToBadge}. */
export function badgeToRelative(abs: Rect, free: FreeArea): Rect {
	if (free.w <= 0 || free.h <= 0) {
		throw new Error("Área livre com dimensão inválida.");
	}
	return {
		x: (abs.x - free.x) / free.w,
		y: (abs.y - free.y) / free.h,
		w: abs.w / free.w,
		h: abs.h / free.h,
	};
}

/** Clamp a rect so it stays fully inside the free area's padded box. */
export function clampToFreeArea(rect: Rect, free: FreeArea): Rect {
	const pad = free.padding;
	const minX = free.x + pad;
	const minY = free.y + pad;
	const maxX = free.x + free.w - pad;
	const maxY = free.y + free.h - pad;
	const w = Math.min(Math.max(rect.w, 0), Math.max(maxX - minX, 0));
	const h = Math.min(Math.max(rect.h, 0), Math.max(maxY - minY, 0));
	return {
		x: Math.min(Math.max(rect.x, minX), Math.max(maxX - w, minX)),
		y: Math.min(Math.max(rect.y, minY), Math.max(maxY - h, minY)),
		w,
		h,
	};
}
