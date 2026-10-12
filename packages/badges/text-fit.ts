export interface FitTextInput {
	text: string;
	/** Available width in mm (or pt — keep consistent with measure). */
	maxWidth: number;
	/** Starting font size in pt. */
	fontSizePt: number;
	/** Minimum font size in pt before truncating. */
	minFontSizePt: number;
	/** Width measurement using the SAME embedded font bytes as the PDF. */
	measure: (text: string, sizePt: number) => number;
	maxLines: number;
}

/**
 * Shrink text down to min size, then truncate with ellipsis.
 * Returns laid-out lines (already wrapped per maxLines).
 */
export function fitTextLines(input: FitTextInput): {
	fontSizePt: number;
	lines: string[];
	truncated: boolean;
} {
	const { text, maxWidth, minFontSizePt, measure, maxLines } = input;
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

	let lines = wrap(size);
	while (
		(lines.length > maxLines ||
			lines.some((l) => measure(l, size) > maxWidth)) &&
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
	// Ellipsis on last line if still overflowing.
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
