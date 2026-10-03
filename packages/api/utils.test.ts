import { describe, expect, it } from "vitest";

import { createEnumArraySchema, transformSingleToArray } from "./utils";

describe("transformSingleToArray", () => {
	it("returns arrays unchanged", () => {
		expect(transformSingleToArray(["a", "b"])).toEqual(["a", "b"]);
	});

	it("splits comma-separated strings and trims whitespace", () => {
		expect(transformSingleToArray("a, b ,c")).toEqual(["a", "b", "c"]);
	});

	it("wraps a single value in an array", () => {
		expect(transformSingleToArray("a")).toEqual(["a"]);
		expect(transformSingleToArray(1)).toEqual([1]);
	});

	it("returns undefined when the value is undefined", () => {
		expect(transformSingleToArray(undefined)).toBeUndefined();
	});
});

describe("createEnumArraySchema", () => {
	const schema = createEnumArraySchema(["internal", "external"] as const);

	it("parses a comma-separated string into an enum array", () => {
		expect(schema.parse("internal,external")).toEqual(["internal", "external"]);
	});

	it("passes arrays through", () => {
		expect(schema.parse(["internal"])).toEqual(["internal"]);
	});

	it("rejects values outside the enum", () => {
		expect(() => schema.parse("unknown")).toThrow();
		expect(() => schema.parse(["internal", "unknown"])).toThrow();
	});
});
