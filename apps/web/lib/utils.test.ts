import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
	it("concatenates class names", () => {
		expect(cn("a", "b")).toBe("a b");
	});

	it("resolves conflicting tailwind classes", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
	});

	it("ignores falsy values", () => {
		const hidden: string | false = false;
		expect(cn("a", hidden, undefined, null)).toBe("a");
	});
});
