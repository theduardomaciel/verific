import { describe, expect, it } from "vitest";

import type { SQL } from "@verific/drizzle/orm";
import { user } from "@verific/drizzle/schema";

import { fuzzyRank, fuzzySearch } from "./search";

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
		expect(params).toContain("joao");
	});

	it("falls back to substring for terms shorter than a trigram", () => {
		const { sql } = fuzzySearch([user.name], "jo")!.toQuery(renderConfig);

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
