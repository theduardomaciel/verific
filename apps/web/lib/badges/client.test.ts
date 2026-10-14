import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

import { defaultBadgeItems, type BadgeItem } from "@verific/badges";

import {
	allowedWeightsForItem,
	collectBadgeFonts,
	createBadgePrintContext,
	missingFontWeights,
	type ThemeFontRoles,
} from "./client";

const roles: ThemeFontRoles = {
	heading: { family: "Press Start 2P", weights: [400], scale: 1 },
	subtitle: { family: "Press Start 2P", weights: [400], scale: 1 },
	body: { family: "Inter", weights: [400, 700], scale: 1 },
};

describe("badge font resolution", () => {
	it("resolves weights from the real font catalog, not just role weights", async () => {
		const layout = {
			badgeW: 90,
			badgeH: 55,
			freeArea: { x: 5, y: 5, w: 80, h: 45, radius: 3, padding: 3 },
			items: defaultBadgeItems(),
		} as Parameters<typeof collectBadgeFonts>[0];
		const fonts = await collectBadgeFonts(layout, roles);
		// Press Start 2P só tem 400 no catálogo: 700 → 400.
		const press = fonts.find((f) => f.family === "Press Start 2P");
		expect(press).toEqual({
			family: "Press Start 2P",
			requested: 700,
			resolved: 400,
		});
		// Inter tem 400 no catálogo: mantém 400.
		const inter = fonts.find((f) => f.family === "Inter");
		expect(inter?.requested).toBe(400);
		expect(inter?.resolved).toBe(400);
	});

	it("keeps a weight that exists in the catalog even if absent from the theme role", async () => {
		// Papel "body"/Inter com tema limitado a [400,700], mas o item pede
		// 900: o catálogo do Inter tem 900, então o impresso usa 900 (sem
		// aviso) — antes era truncado para 700 pelos pesos do papel.
		const base = defaultBadgeItems();
		const items: BadgeItem[] = [
			{ ...base[0], weight: 400 } as BadgeItem,
			{
				...base[1],
				source: "institution",
				fontRole: "body",
				weight: 900,
			} as BadgeItem,
			base[2] as BadgeItem,
		];
		const layout = {
			badgeW: 90,
			badgeH: 55,
			freeArea: { x: 5, y: 5, w: 80, h: 45, radius: 3, padding: 3 },
			items,
		} as Parameters<typeof collectBadgeFonts>[0];
		const warnings = await missingFontWeights(layout, roles);
		expect(warnings).toEqual([]);
	});

	it("warns naming the substitute weight", async () => {
		const layout = {
			badgeW: 90,
			badgeH: 55,
			freeArea: { x: 5, y: 5, w: 80, h: 45, radius: 3, padding: 3 },
			items: defaultBadgeItems(),
		} as Parameters<typeof missingFontWeights>[0];
		const warnings = await missingFontWeights(layout, roles);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain("700");
		expect(warnings[0]).toContain("400");
	});

	it("lists catalog weights for the item's family", () => {
		const name = defaultBadgeItems()[0];
		if (!name || name.kind !== "text") {
			throw new Error("expected the name text item");
		}
		const catalog = new Map([
			["press start 2p", [400]],
			["inter", [400, 600, 700]],
		]);
		const options = allowedWeightsForItem(name, roles, catalog);
		// Press Start 2P só tem 400; o peso pedido (700) entra na lista.
		expect(options).toContain(400);
		expect(options).toContain(700);
		// Família custom usa o catálogo dela, não o do papel.
		const custom = {
			...name,
			family: "Inter",
			fontRole: "heading" as const,
		};
		expect(allowedWeightsForItem(custom, roles, catalog)).toEqual([
			400, 600, 700,
		]);
	});

	it("registers preview faces with weight descriptors (no cross-item bleed)", async () => {
		const bytes = await readFile(
			new URL(
				"../../../../packages/badges/fixtures/HankenGrotesk-400.ttf",
				import.meta.url,
			),
		);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(bytes)),
		);
		const constructed: { family: string; descriptors: unknown }[] = [];
		const added: unknown[] = [];
		class FakeFontFace {
			readonly descriptors: unknown;
			constructor(
				public family: string,
				public source: unknown,
				descriptors?: unknown,
			) {
				this.descriptors = descriptors;
				constructed.push({ family, descriptors });
			}
			async load() {
				return this;
			}
		}
		vi.stubGlobal("window", globalThis);
		vi.stubGlobal("FontFace", FakeFontFace);
		vi.stubGlobal("document", {
			fonts: { add: vi.fn((f: unknown) => void added.push(f)) },
		});
		try {
			const hankenRoles: ThemeFontRoles = {
				heading: {
					family: "Hanken Grotesk",
					weights: [400, 700],
					scale: 1,
				},
				subtitle: {
					family: "Hanken Grotesk",
					weights: [400, 700],
					scale: 1,
				},
				body: {
					family: "Hanken Grotesk",
					weights: [400, 700],
					scale: 1,
				},
			};
			// Nome @700 + secundária @400 na MESMA família: antes, ambas
			// as faces eram registradas sem descritores (peso 400
			// implícito) e o navegador escolhia entre os dois arquivos de
			// forma ambígua — trocar a fonte de um item mudava o outro.
			const layout = {
				badgeW: 90,
				badgeH: 55,
				freeArea: { x: 5, y: 5, w: 80, h: 45, radius: 3, padding: 3 },
				items: defaultBadgeItems(),
			} as Parameters<typeof collectBadgeFonts>[0];
			const ctx = await createBadgePrintContext(layout, hankenRoles);
			expect(
				constructed
					.filter((c) => c.family === "Hanken Grotesk")
					.map((c) => c.descriptors),
			).toEqual(
				expect.arrayContaining([
					{ weight: "400", style: "normal" },
					{ weight: "700", style: "normal" },
				]),
			);
			expect(added).toHaveLength(2);
			// Mede com ambas as chaves (pedido e resolvido).
			expect(
				ctx.measure("Teste", "Hanken Grotesk", 700, 12),
			).toBeGreaterThan(0);
			expect(
				ctx.measure("Teste", "Hanken Grotesk", 400, 12),
			).toBeGreaterThan(0);
			// Segunda construção não duplica faces já registradas.
			await createBadgePrintContext(layout, hankenRoles);
			expect(added).toHaveLength(2);
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
