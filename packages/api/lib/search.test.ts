import { describe, expect, it, vi } from "vitest";

import type { SQL } from "@verific/drizzle/orm";
import { user } from "@verific/drizzle/schema";

import { fuzzyRank, fuzzySearch, searchWithTypoFallback } from "./search";

type BuildConfig = Parameters<SQL["toQuery"]>[0];

/** Config mínima para renderizar SQL sem um dialeto/driver real. */
const renderConfig = {
	casing: {
		getColumnCasing: (column: { name: string }) => column.name,
	},
	escapeName: (name: string) => `"${name}"`,
	escapeParam: (index: number) => `$${index + 1}`,
	escapeString: (value: string) => `'${value}'`,
} as unknown as BuildConfig;

describe("fuzzySearch", () => {
	it("returns undefined for an empty query", () => {
		expect(fuzzySearch([user.name], undefined)).toBeUndefined();
		expect(fuzzySearch([user.name], "   ")).toBeUndefined();
		expect(fuzzySearch([], "ana")).toBeUndefined();
	});

	it("matches by substring and word similarity on every column", () => {
		const { sql, params } = fuzzySearch(
			[user.name, user.email],
			"joao",
		)!.toQuery(renderConfig);

		expect(sql).toContain(
			`public.immutable_unaccent(lower("users"."name"))`,
		);
		expect(sql).toContain(
			`public.immutable_unaccent(lower("users"."email"))`,
		);
		expect(sql).toContain("ilike");
		expect(sql).toContain("word_similarity");
		expect(params).toContain("%joao%");
	});

	it("keeps LIKE wildcards from the query literal", () => {
		const { params } = fuzzySearch([user.name], "a_b%")!.toQuery(
			renderConfig,
		);

		expect(params).toContain("%a\\_b\\%%");
	});

	it("falls back to substring for terms shorter than a trigram", () => {
		const { sql } = fuzzySearch([user.name], "jo")!.toQuery(renderConfig);

		expect(sql).toContain("ilike");
		expect(sql).not.toContain("word_similarity");
	});

	it("skips word similarity when approximate is off", () => {
		const { sql } = fuzzySearch([user.name], "eduardo", {
			approximate: false,
		})!.toQuery(renderConfig);

		expect(sql).toContain("ilike");
		expect(sql).not.toContain("word_similarity");
	});

	it("requires every token to match", () => {
		const { sql, params } = fuzzySearch([user.name], "ana silva")!.toQuery(
			renderConfig,
		);

		expect(sql).toContain(" and ");
		expect(params).toContain("ana");
		expect(params).toContain("silva");
	});
});

describe("fuzzyRank", () => {
	it("returns undefined for an empty query", () => {
		expect(fuzzyRank([user.name], undefined)).toBeUndefined();
	});

	it("scores the best word similarity per term", () => {
		const { sql, params } = fuzzyRank(
			[user.name, user.email],
			"joao",
		)!.toQuery(renderConfig);

		expect(sql).toContain("greatest(");
		expect(sql).toContain("word_similarity(");
		expect(params).toContain("joao");
	});
});

describe("searchWithTypoFallback", () => {
	it("keeps the exact results when something matches", async () => {
		const run = vi.fn(async (approximate: boolean) => ({
			amount: approximate ? 9 : 2,
		}));

		await expect(searchWithTypoFallback("maria", run)).resolves.toEqual({
			amount: 2,
		});
		expect(run).toHaveBeenCalledTimes(1);
	});

	it("tolerates typos only when nothing matches exactly", async () => {
		const run = vi.fn(async (approximate: boolean) => ({
			amount: approximate ? 3 : 0,
		}));

		await expect(searchWithTypoFallback("edurado", run)).resolves.toEqual({
			amount: 3,
		});
		expect(run).toHaveBeenLastCalledWith(true);
	});

	it("does not retry an empty query", async () => {
		const run = vi.fn(async () => ({ amount: 0 }));

		await searchWithTypoFallback("  ", run);
		expect(run).toHaveBeenCalledTimes(1);
	});
});
