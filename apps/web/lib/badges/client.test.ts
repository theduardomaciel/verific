import { describe, expect, it } from "vitest";

import { defaultBadgeItems } from "@verific/badges";

import {
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
	it("resolves requested weights to the nearest available", () => {
		const layout = {
			badgeW: 90,
			badgeH: 55,
			freeArea: { x: 5, y: 5, w: 80, h: 45, radius: 3, padding: 3 },
			items: defaultBadgeItems(),
		} as Parameters<typeof collectBadgeFonts>[0];
		expect(collectBadgeFonts(layout, roles)).toEqual([
			{ family: "Press Start 2P", requested: 700, resolved: 400 },
			{ family: "Inter", requested: 400, resolved: 400 },
		]);
	});

	it("warns naming the substitute weight", () => {
		const layout = {
			badgeW: 90,
			badgeH: 55,
			freeArea: { x: 5, y: 5, w: 80, h: 45, radius: 3, padding: 3 },
			items: defaultBadgeItems(),
		} as Parameters<typeof missingFontWeights>[0];
		const warnings = missingFontWeights(layout, roles);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain("700");
		expect(warnings[0]).toContain("400");
	});
});
