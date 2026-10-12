import { describe, expect, it } from "vitest";

import * as root from "./index";

describe("root entry (páginas públicas só importam daqui)", () => {
	it("reexporta tipos, consts e helpers puros (sem o catálogo)", () => {
		for (const name of [
			"FONT_CATEGORIES",
			"FONT_ROLES",
			"SCALE_LIMITS",
			"FALLBACK_STACKS",
			"buildFontPreviewUrl",
			"buildFontStack",
			"buildFontStylesheetUrl",
			"buildSelectionStylesheetUrl",
			"buildSizeAdjust",
			"hasLatin",
			"hasLatinExt",
			"normalizeFamily",
			"slugifyFamily",
		] as const) {
			expect((root as Record<string, unknown>)[name], name).toBeDefined();
		}
	});

	it("não puxa o catálogo (getFont/getCatalog ficam nos submódulos)", () => {
		expect("getFont" in root).toBe(false);
		expect("getCatalog" in root).toBe(false);
	});
});
