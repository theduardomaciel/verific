export interface FitTextInput {
	text: string;
	/** Available width in mm (or pt — keep consistent with measure). */
	maxWidth: number;
	/**
	 * Available block height, same unit as `measure` output. Text shrinks
	 * and then loses lines (ellipsis) to fit — rendered text never
	 * overflows its layout box into neighbouring items.
	 */
	maxHeight?: number;
	/** Starting font size in pt. */
	fontSizePt: number;
	/** Minimum font size in pt before truncating. */
	minFontSizePt: number;
	/** Width measurement using the SAME embedded font bytes as the PDF. */
	measure: (text: string, sizePt: number) => number;
	maxLines: number;
}

const PT_TO_MM = 0.3527777778;
const LINE_HEIGHT = 1.2;

/** Visual block height: first baseline at font size + spacing per line. */
function blockHeightMm(lineCount: number, sizePt: number): number {
	if (lineCount <= 0) return 0;
	return (
		sizePt * PT_TO_MM + (lineCount - 1) * (sizePt * LINE_HEIGHT * PT_TO_MM)
	);
}

/**
 * Shrink text down to min size, then truncate with ellipsis — fitting
 * width, line count AND block height. Returns laid-out lines.
 */
export function fitTextLines(input: FitTextInput): {
	fontSizePt: number;
	lines: string[];
	truncated: boolean;
} {
	const { text, maxWidth, maxHeight, minFontSizePt, measure, maxLines } =
		input;
	let size = input.fontSizePt;
	const words = text.split(/\s+/).filter(Boolean);
	const wrap = (s: number): string[] => {
		const lines: string[] = [];
		let current = "";
		for (const word of words) {
			const candidate = current ? `${current} ${word}` : word;
			if (measure(candidate, s) <= maxWidth || !current) {
				current = candidate;
			} else {
				lines.push(current);
				current = word;
			}
		}
		if (current) lines.push(current);
		return lines;
	};
	const fitsWidth = (ls: string[], s: number) =>
		ls.every((l) => measure(l, s) <= maxWidth);
	const fitsHeight = (count: number, s: number) =>
		maxHeight === undefined || blockHeightMm(count, s) <= maxHeight;

	let lines = wrap(size);
	while (
		(lines.length > maxLines ||
			!fitsWidth(lines, size) ||
			!fitsHeight(lines.length, size)) &&
		size > minFontSizePt
	) {
		size = Math.max(minFontSizePt, Math.round((size - 0.5) * 10) / 10);
		lines = wrap(size);
	}
	let truncated = false;
	if (lines.length > maxLines) {
		lines = lines.slice(0, maxLines);
		truncated = true;
	}
	// Cut lines (ellipsis on the last) until the block fits the height.
	while (lines.length > 1 && !fitsHeight(lines.length, size)) {
		lines = lines.slice(0, -1);
		truncated = true;
	}
	// Ellipsis on last line if still overflowing the width.
	const last = lines[lines.length - 1];
	if (last !== undefined && measure(last, size) > maxWidth) {
		let cut = last;
		while (cut.length > 1 && measure(`${cut}…`, size) > maxWidth) {
			cut = cut.slice(0, -1);
		}
		lines[lines.length - 1] = cut.length > 1 ? `${cut}…` : "…";
		truncated = true;
	}
	return { fontSizePt: size, lines, truncated };
}
