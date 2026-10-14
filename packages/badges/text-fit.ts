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

export interface FitTextResult {
	fontSizePt: number;
	lines: string[];
	truncated: boolean;
	/** Visual block height in mm (first baseline at 1em + line spacing). */
	heightMm: number;
}

export const PT_TO_MM = 0.3527777778;
export const LINE_HEIGHT = 1.2;

/** Visual block height: first baseline at font size + spacing per line. */
export function blockHeightMm(lineCount: number, sizePt: number): number {
	if (lineCount <= 0) return 0;
	return (
		sizePt * PT_TO_MM + (lineCount - 1) * (sizePt * LINE_HEIGHT * PT_TO_MM)
	);
}

/**
 * Shrink text down to min size, then truncate with ellipsis — fitting
 * width, line count AND block height. Returns laid-out lines.
 */
export function fitTextLines(input: FitTextInput): FitTextResult {
	const { text, maxWidth, maxHeight, minFontSizePt, measure, maxLines } =
		input;
	const eps = 1e-6;
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
		ls.every((l) => measure(l, s) <= maxWidth + eps);
	const fitsHeight = (count: number, s: number) =>
		maxHeight === undefined || blockHeightMm(count, s) <= maxHeight + eps;

	/** Appends "…" to `line`, trimming characters until it fits the width. */
	const ellipsize = (line: string, s: number): string => {
		const chars = Array.from(line.trimEnd());
		while (
			chars.length > 1 &&
			measure(`${chars.join("")}…`, s) > maxWidth
		) {
			chars.pop();
		}
		const base = chars.join("").trimEnd();
		return base.length > 0 ? `${base}…` : "…";
	};

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
	let dropped = false;
	if (lines.length > maxLines) {
		lines = lines.slice(0, maxLines);
		dropped = true;
	}
	// Cut lines until the block fits the height (always keep at least one).
	while (lines.length > 1 && !fitsHeight(lines.length, size)) {
		lines = lines.slice(0, -1);
		dropped = true;
	}

	// Lines were dropped: say so with an ellipsis on the last kept line.
	// A line still wider than the box (e.g. one long word) is also cut.
	lines = lines.map((line, i) => {
		const isLast = i === lines.length - 1;
		if ((dropped && isLast) || measure(line, size) > maxWidth + eps) {
			truncated = true;
			return ellipsize(line, size);
		}
		return line;
	});

	return {
		fontSizePt: size,
		lines,
		truncated,
		heightMm: blockHeightMm(lines.length, size),
	};
}
