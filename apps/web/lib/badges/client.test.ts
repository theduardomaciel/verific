import { describe, expect, it } from "vitest";

import { defaultBadgeItems } from "@verific/badges";

import {
	allowedWeightsForItem,
	collectBadgeFonts,
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
		const items: import("@verific/badges").BadgeItem[] = [
			{ ...base[0], weight: 400 } as import("@verific/badges").BadgeItem,
			{
				...base[1],
				source: "institution",
				fontRole: "body",
				weight: 900,
			} as import("@verific/badges").BadgeItem,
			base[2] as import("@verific/badges").BadgeItem,
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
});
