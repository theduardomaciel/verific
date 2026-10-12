/** Canonical unit is millimetres (floats). Convert to pt only at render time. */

export type LengthUnit = "mm" | "in" | "pt" | "px";

export const MM_PER_IN = 25.4;
export const PT_PER_IN = 72;

/** CSS px at 96dpi. */
export const PX_PER_IN = 96;

export function toMm(value: number, from: LengthUnit): number {
	switch (from) {
		case "mm":
			return value;
		case "in":
			return value * MM_PER_IN;
		case "pt":
			return (value * MM_PER_IN) / PT_PER_IN;
		case "px":
			return (value * MM_PER_IN) / PX_PER_IN;
	}
}

export function fromMm(valueMm: number, to: LengthUnit): number {
	switch (to) {
		case "mm":
			return valueMm;
		case "in":
			return valueMm / MM_PER_IN;
		case "pt":
			return (valueMm * PT_PER_IN) / MM_PER_IN;
		case "px":
			return (valueMm * PX_PER_IN) / MM_PER_IN;
	}
}

/** mm → PDF points (1in = 72pt). */
export function mmToPt(mm: number): number {
	return (mm * PT_PER_IN) / MM_PER_IN;
}

/** PDF points → mm. */
export function ptToMm(pt: number): number {
	return (pt * MM_PER_IN) / PT_PER_IN;
}

/** Effective dpi of a raster at a physical width. */
export function effectiveDpi(pixelWidth: number, widthMm: number): number {
	if (widthMm <= 0) return 0;
	return (pixelWidth * MM_PER_IN) / widthMm;
}

/** True when raster artwork is below ~300dpi at the chosen print width. */
export function isLowResolution(
	pixelWidth: number,
	widthMm: number,
	floorDpi = 300,
): boolean {
	return effectiveDpi(pixelWidth, widthMm) < floorDpi;
}
