import { afterEach, describe, expect, it, vi } from "vitest";

import { DrizzleQueryError } from "@verific/drizzle/orm";

import { register } from "./instrumentation";

const original = { ...console };

describe("register", () => {
	afterEach(() => {
		Object.assign(console, original);
	});

	it("tira os parâmetros das queries de todo log do servidor", async () => {
		const printed = vi.fn();
		console.error = printed;
		await register();

		console.error(
			"falhou:",
			new DrizzleQueryError(
				"select 1",
				["token-secreto"],
				new Error("x"),
			),
		);

		const [label, error] = printed.mock.calls[0]!;
		expect(label).toBe("falhou:");
		expect(String((error as Error).message)).not.toContain("token-secreto");
	});
});
