import { describe, expect, it } from "vitest";

import {
	createMemoryFontStore,
	fontCacheKey,
	gwfhSlug,
	pickStaticTtfUrl,
} from "./fonts";

describe("fonts", () => {
	it("keys the cache by family + weight", () => {
		expect(fontCacheKey("Inter", 700)).toBe("inter@700");
		expect(fontCacheKey("Hanken Grotesk", 400)).toBe("hanken grotesk@400");
	});

	it("slugifies families for the metadata API", () => {
		expect(gwfhSlug("Hanken Grotesk")).toBe("hanken-grotesk");
		expect(gwfhSlug("Space Grotesk")).toBe("space-grotesk");
		expect(gwfhSlug("REM")).toBe("rem");
	});

	it("picks the exact static weight (normal style only)", () => {
		const variants = [
			{ id: "400", fontStyle: "normal", fontWeight: "400", ttf: "a.ttf" },
			{ id: "700", fontStyle: "normal", fontWeight: "700", ttf: "b.ttf" },
			{
				id: "700italic",
				fontStyle: "italic",
				fontWeight: "700",
				ttf: "c.ttf",
			},
		];
		expect(pickStaticTtfUrl(variants, 700)).toBe("b.ttf");
		expect(pickStaticTtfUrl(variants, 500)).toBeNull();
	});

	it("caches bytes in memory", async () => {
		const store = createMemoryFontStore();
		expect(await store.get("inter@400")).toBeUndefined();
		await store.set("inter@400", new Uint8Array([1, 2, 3]));
		expect(await store.get("inter@400")).toEqual(new Uint8Array([1, 2, 3]));
	});
});
