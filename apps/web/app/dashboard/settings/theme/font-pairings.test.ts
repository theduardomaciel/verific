import { describe, expect, it } from "vitest";

import { getFont } from "@verific/fonts/catalog";

import { SUGGESTED_PAIRINGS } from "./font-pairings";

describe("suggested pairings", () => {
	it("usa só famílias do catálogo, com pesos oferecidos", () => {
		expect(SUGGESTED_PAIRINGS.length).toBeGreaterThan(0);
		for (const pairing of SUGGESTED_PAIRINGS) {
			for (const selection of [
				pairing.heading,
				pairing.subtitle,
				pairing.body,
			]) {
				const entry = getFont(selection.family);
				expect(entry, pairing.name).toBeDefined();
				for (const weight of selection.weights) {
					expect(entry?.weights).toContain(weight);
				}
			}
		}
	});
});
