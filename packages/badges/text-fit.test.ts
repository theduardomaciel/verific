import { describe, expect, it } from "vitest";

import { fitTextLines } from "./text-fit";

const measure = (text: string, sizePt: number) => text.length * sizePt * 0.5;

describe("text-fit", () => {
	it("keeps short text at full size", () => {
		const out = fitTextLines({
			text: "Ana Souza",
			maxWidth: 100,
			fontSizePt: 20,
			minFontSizePt: 10,
			measure,
			maxLines: 2,
		});
		expect(out.fontSizePt).toBe(20);
		expect(out.lines).toEqual(["Ana Souza"]);
		expect(out.truncated).toBe(false);
	});

	it("shrinks long names down to the minimum before truncating", () => {
		const out = fitTextLines({
			text: "Conceição de Almeida Souza e Silva Pereira dos Santos",
			maxWidth: 60,
			fontSizePt: 20,
			minFontSizePt: 10,
			measure,
			maxLines: 2,
		});
		expect(out.fontSizePt).toBeLessThanOrEqual(20);
		expect(out.lines.length).toBeLessThanOrEqual(2);
		for (const line of out.lines) {
			expect(measure(line, out.fontSizePt)).toBeLessThanOrEqual(
				60 + 1e-9,
			);
		}
	});

	it("truncates with ellipsis when even the minimum overflows", () => {
		const out = fitTextLines({
			text: "Supercalifragilisticexpialidocious".repeat(4),
			maxWidth: 10,
			fontSizePt: 12,
			minFontSizePt: 10,
			measure,
			maxLines: 1,
		});
		expect(out.fontSizePt).toBe(10);
		expect(out.lines).toHaveLength(1);
		expect(out.lines[0]?.endsWith("…")).toBe(true);
		expect(out.truncated).toBe(true);
	});

	it("shrinks to fit the box height", () => {
		const out = fitTextLines({
			text: "Conceição de Almeida Souza e Silva",
			maxWidth: 60,
			maxHeight: 10,
			fontSizePt: 20,
			minFontSizePt: 8,
			measure,
			maxLines: 4,
		});
		const K = 0.3527777778;
		const height =
			out.fontSizePt * K +
			(out.lines.length - 1) * (out.fontSizePt * 1.2 * K);
		expect(height).toBeLessThanOrEqual(10 + 1e-9);
		expect(out.lines.length).toBeLessThanOrEqual(4);
		expect(out.fontSizePt).toBeLessThan(20);
	});

	it("cuts lines with ellipsis when the box fits a single line", () => {
		const out = fitTextLines({
			text: "Linha um Linha dois Linha três Linha quatro",
			maxWidth: 60,
			maxHeight: 5,
			fontSizePt: 12,
			minFontSizePt: 12,
			measure,
			maxLines: 4,
		});
		expect(out.lines).toHaveLength(1);
		expect(out.truncated).toBe(true);
	});

	it("keeps short text untouched when height is generous", () => {
		const out = fitTextLines({
			text: "Ana Souza",
			maxWidth: 100,
			maxHeight: 50,
			fontSizePt: 20,
			minFontSizePt: 10,
			measure,
			maxLines: 2,
		});
		expect(out.fontSizePt).toBe(20);
		expect(out.lines).toEqual(["Ana Souza"]);
		expect(out.truncated).toBe(false);
	});
});
