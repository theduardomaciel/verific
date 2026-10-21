import { describe, expect, it } from "vitest";

import { normalizeActivityIds } from "./activity-availability";

describe("normalizeActivityIds", () => {
	it("remove duplicatas e ordena os ids", () => {
		expect(normalizeActivityIds(["b", "a", "b", "c", "a"])).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	it("não altera a lista de entrada", () => {
		const input = ["b", "a"];
		normalizeActivityIds(input);
		expect(input).toEqual(["b", "a"]);
	});

	it("mantém lista vazia estável", () => {
		expect(normalizeActivityIds([])).toEqual([]);
	});
});
