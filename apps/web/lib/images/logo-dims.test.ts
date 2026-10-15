// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { logoDimsInput, type LogoUrlField } from "@/lib/images/logo-dims";

const FIELDS: LogoUrlField[] = [
	"logoUrl",
	"logoDarkUrl",
	"largeLogoUrl",
	"largeLogoDarkUrl",
];

describe("logoDimsInput", () => {
	it("mapeia cada campo p/ suas colunas", () => {
		expect(logoDimsInput("logoUrl", { width: 512, height: 512 })).toEqual({
			logoSide: 512,
		});
		expect(
			logoDimsInput("logoDarkUrl", { width: 400, height: 400 }),
		).toEqual({ logoDarkSide: 400 });
		expect(
			logoDimsInput("largeLogoUrl", { width: 768, height: 384 }),
		).toEqual({ largeLogoWidth: 768, largeLogoHeight: 384 });
		expect(
			logoDimsInput("largeLogoDarkUrl", { width: 700, height: 100 }),
		).toEqual({ largeLogoDarkWidth: 700, largeLogoDarkHeight: 100 });
	});

	it("retorna undefined p/ campo intocado", () => {
		for (const field of FIELDS) {
			expect(logoDimsInput(field, undefined)).toBeUndefined();
		}
	});

	it("zera as colunas quando o logo é removido", () => {
		expect(logoDimsInput("logoUrl", null)).toEqual({
			logoSide: null,
		});
	});
});
