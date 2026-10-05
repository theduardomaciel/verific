import { describe, expect, it } from "vitest";

import { isFilled } from "@/lib/forms/layout";
import {
	formatProfileValue,
	isCompatible,
	isFieldLinked,
	normalizeSocialLink,
	parseProfileLayout,
	socialDisplayHandle,
	slotForField,
} from "@verific/drizzle/profile-layout";

describe("shared social normalize", () => {
	it("normaliza handle e URL (inclusive Lattes http)", () => {
		expect(normalizeSocialLink("github", "fulana")).toBe(
			"https://github.com/fulana",
		);
		expect(normalizeSocialLink("lattes", "0993964740433171")).toBe(
			"http://lattes.cnpq.br/0993964740433171",
		);
		expect(
			normalizeSocialLink("lattes", "lattes.cnpq.br/0993964740433171"),
		).toBe("http://lattes.cnpq.br/0993964740433171");
		expect(normalizeSocialLink("github", "")).toBeNull();
		expect(normalizeSocialLink("unknown", "x")).toBeNull();
	});

	it("extrai handle p/ exibição", () => {
		expect(socialDisplayHandle("https://github.com/fulana")).toBe("fulana");
		expect(socialDisplayHandle("http://lattes.cnpq.br/0993964740433171")).toBe(
			"0993964740433171",
		);
	});
});

describe("profile layout", () => {
	const F_SUB = "11111111-1111-4111-8111-111111111111";
	const F_CITY = "22222222-2222-4222-8222-222222222222";
	const layout = parseProfileLayout({
		version: 1,
		subtitleFieldId: F_SUB,
		bioFieldId: null,
		stats: [{ fieldId: F_CITY, label: "Cidade", icon: "map-pin" }],
		socialsFieldId: null,
		emailFieldId: null,
		connectionsEnabled: true,
		badgesEnabled: false,
	});

	it("resolve slots e compatibilidade", () => {
		expect(slotForField(layout, F_SUB)).toMatchObject({ slot: "subtitle" });
		expect(slotForField(layout, F_CITY)).toMatchObject({
			slot: "stats",
			statIndex: 0,
		});
		expect(slotForField(layout, "nope")).toBeNull();
		expect(isFieldLinked(layout, F_SUB)).toBe(true);
		expect(isFieldLinked(layout, "nope")).toBe(false);
		expect(isCompatible("subtitle", "text")).toBe(true);
		expect(isCompatible("subtitle", "textarea")).toBe(false);
		expect(isCompatible("bio", "text")).toBe(true);
		expect(isCompatible("socials", "social_links")).toBe(true);
	});

	it("aplica padrões", () => {
		const d = parseProfileLayout(null);
		expect(d.stats).toEqual([]);
		expect(d.connectionsEnabled).toBe(true);
		expect(d.badgesEnabled).toBe(false);
	});

	it("formata valores por tipo (pt-BR)", () => {
		expect(formatProfileValue("  x  ", "text")).toBe("x");
		expect(formatProfileValue("", "text")).toBeNull();
		expect(formatProfileValue(1500, "number")).toBe("1.500");
		expect(formatProfileValue(new Date("2004-03-16T12:00:00"), "date")).toContain(
			"2004",
		);
		expect(formatProfileValue(true, "checkbox")).toBe("Sim");
		expect(formatProfileValue(["a", "b"], "select_multiple")).toBe("a; b");
		expect(formatProfileValue(null, "text")).toBeNull();
	});
});

describe("isFilled", () => {
	it("mede preenchimento", () => {
		expect(isFilled("x")).toBe(true);
		expect(isFilled("")).toBe(false);
		expect(isFilled(["a"])).toBe(true);
		expect(isFilled([])).toBe(false);
		expect(isFilled(true)).toBe(true);
		expect(isFilled(false)).toBe(false);
		expect(isFilled(null)).toBe(false);
	});
});
