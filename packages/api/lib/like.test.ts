import { describe, expect, it } from "vitest";

import { containsPattern, escapeLike } from "./like";

describe("escapeLike", () => {
	it("escapes the LIKE wildcards and the escape character", () => {
		expect(escapeLike("a_b%c\\d")).toBe("a\\_b\\%c\\\\d");
	});

	it("keeps plain text as is", () => {
		expect(containsPattern("ana")).toBe("%ana%");
	});
});
