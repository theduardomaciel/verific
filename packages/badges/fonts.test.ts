import { describe, expect, it, vi } from "vitest";

import {
	createMemoryFontStore,
	createProxiedTtfFetcher,
	fontCacheKey,
	gwfhSlug,
	pickStaticTtfUrl,
	proxyFontUrl,
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

	it("builds same-origin proxy URLs", () => {
		expect(
			proxyFontUrl("/api/badge-fonts/file", "Hanken Grotesk", 700),
		).toBe("/api/badge-fonts/file?family=Hanken%20Grotesk&weight=700");
	});

	it("fetches TTF bytes through the proxy", async () => {
		const bytes = new Uint8Array([0, 1, 0, 0, 9]);
		const fetchImpl = vi.fn(async (url: string) => {
			expect(url).toBe("/api/badge-fonts/file?family=Poppins&weight=400");
			return new Response(bytes, { status: 200 });
		});
		const fetcher = createProxiedTtfFetcher(
			"/api/badge-fonts/file",
			fetchImpl as unknown as typeof fetch,
		);
		await expect(
			fetcher({ family: "Poppins", weight: 400 }),
		).resolves.toEqual(bytes);
	});

	it("surfaces proxy errors without silent fallback", async () => {
		const fetchImpl = vi.fn(
			async () => new Response("nope", { status: 404 }),
		);
		const fetcher = createProxiedTtfFetcher(
			"/api/badge-fonts/file",
			fetchImpl as unknown as typeof fetch,
		);
		await expect(fetcher({ family: "Nope", weight: 400 })).rejects.toThrow(
			/404/,
		);
		await expect(
			createProxiedTtfFetcher("/api/badge-fonts/file", (async () => {
				throw new TypeError("NetworkError");
			}) as unknown as typeof fetch)({ family: "Poppins", weight: 400 }),
		).rejects.toThrow(/rede/);
	});
});
