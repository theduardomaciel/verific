import { describe, expect, it } from "vitest";

import { buildDisplayList } from "./display-list";
import { badgeLayoutSchema, defaultBadgeItems } from "./schema";

const OPTIONS = {
	measure: (
		_text: string,
		_family: string,
		_weight: number,
		sizePt: number,
	) => sizePt,
	fontFamilyForRole: (role: "heading" | "subtitle" | "body") => role,
	scaleForRole: () => 1,
	encodeQr: (payload: string) => {
		const n = 21;
		return Array.from({ length: n }, (_, r) =>
			Array.from(
				{ length: n },
				(_, c) => (r + c + payload.length) % 2 === 0,
			),
		);
	},
};

function layoutWith() {
	return badgeLayoutSchema.parse({
		badgeW: 90,
		badgeH: 55,
		freeArea: { x: 5, y: 5, w: 80, h: 45, radius: 3, padding: 3 },
		items: defaultBadgeItems().map((item) =>
			item.kind === "text" && item.id === "secondary-1"
				? { ...item, source: "institution" }
				: item,
		),
	});
}

describe("display-list", () => {
	it("omits empty secondary lines without breaking the layout", () => {
		const list = buildDisplayList(
			layoutWith(),
			{ name: "Ana", fields: {}, qrPayload: "/ev/profile/Ab12Cd34Ef" },
			OPTIONS,
		);
		const texts = list.filter((p) => p.kind === "text");
		expect(texts).toHaveLength(1);
		expect(list.some((p) => p.kind === "qr")).toBe(true);
	});

	it("keeps every box pinned when a line is missing", () => {
		const full = buildDisplayList(
			layoutWith(),
			{
				name: "Ana",
				fields: { institution: "UFAL" },
				qrPayload: "/ev/profile/X",
			},
			OPTIONS,
		);
		const missing = buildDisplayList(
			layoutWith(),
			{ name: "Ana", fields: {}, qrPayload: "/ev/profile/X" },
			OPTIONS,
		);
		const at = (list: typeof full, kind: string) =>
			list.find((p) => p.kind === kind);
		for (const kind of ["text", "qr"] as const) {
			const a = at(full, kind);
			const b = at(missing, kind);
			expect(a?.kind).toBe(kind);
			expect(b?.kind).toBe(kind);
			if (
				a?.kind === "text" &&
				b?.kind === "text" &&
				a.lines.join() === b.lines.join()
			) {
				expect(b.yMm).toBeCloseTo(a.yMm, 9);
			}
			if (a?.kind === "qr" && b?.kind === "qr") {
				expect(b.rect.x).toBeCloseTo(a.rect.x, 9);
				expect(b.rect.y).toBeCloseTo(a.rect.y, 9);
			}
		}
	});

	it("keeps QR square and inside the free area", () => {
		const list = buildDisplayList(
			layoutWith(),
			{
				name: "Ana",
				fields: { institution: "UFAL" },
				qrPayload: "/ev/profile/X",
			},
			OPTIONS,
		);
		const qr = list.find((p) => p.kind === "qr");
		expect(qr?.kind).toBe("qr");
		if (qr?.kind === "qr") {
			expect(qr.rect.w).toBeCloseTo(qr.rect.h, 9);
			expect(qr.modules).toHaveLength(21);
			expect(qr.quietModules).toBeGreaterThanOrEqual(4);
		}
	});

	it("applies the theme scale multiplier numerically", () => {
		const list = buildDisplayList(
			layoutWith(),
			{
				name: "Ana",
				fields: {},
				qrPayload: "/ev/profile/X",
			},
			{ ...OPTIONS, scaleForRole: () => 1.2 },
		);
		const text = list.find((p) => p.kind === "text");
		if (text?.kind === "text") {
			// Heading default 20pt × 1.2 = 24pt.
			expect(text.fontSizePt).toBeCloseTo(24, 9);
			expect(text.family).toBe("heading");
		} else {
			expect.unreachable("expected a text primitive");
		}
	});
});
