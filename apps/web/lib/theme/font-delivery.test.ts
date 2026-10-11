import { describe, expect, it } from "vitest";

import { presetFont } from "@verific/drizzle/theme";

import { getFontDelivery } from "./font-delivery";

describe("getFontDelivery", () => {
	it("não emite nada quando só há presets (next/font cobre)", () => {
		const delivery = getFontDelivery({
			fonts: { heading: presetFont("rem"), body: presetFont("inter") },
		});
		expect(delivery.googleFontsUrl).toBeNull();
	});

	it("gera css2 só com a fonte avulsa", () => {
		const delivery = getFontDelivery({
			fonts: {
				heading: {
					family: "Playfair Display",
					weights: [700],
					category: "serif",
				},
				body: presetFont("inter"),
			},
		});
		expect(delivery.googleFontsUrl).toContain(
			"family=Playfair+Display:wght@700",
		);
		expect(delivery.googleFontsUrl).toContain("display=swap");
		expect(delivery.googleFontsUrl).not.toContain("Inter");
	});

	it("mescla pesos quando os dois papéis usam a mesma família", () => {
		const delivery = getFontDelivery({
			fonts: {
				heading: {
					family: "Caveat",
					weights: [700],
					category: "handwriting",
				},
				body: {
					family: "Caveat",
					weights: [400],
					category: "handwriting",
				},
			},
		});
		expect(delivery.googleFontsUrl).toBe(
			"https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap",
		);
	});
});
