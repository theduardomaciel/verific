import { describe, expect, it, vi } from "vitest";

vi.mock("@verific/drizzle", () => ({ db: {} }));
vi.mock("@verific/env", () => ({ env: {} }));
// No `after` export: simulates a runtime without Next.js, where the work
// must run inline instead of after the response.
vi.mock("next/server", () => ({}));

import { scheduleAfterResponse } from "./registration-email";

describe("scheduleAfterResponse without a Next runtime", () => {
	it("runs the work inline and swallows failures", async () => {
		const work = vi.fn(async () => {});

		await scheduleAfterResponse(work);

		expect(work).toHaveBeenCalledTimes(1);
	});

	it("never rejects when the work throws", async () => {
		await expect(
			scheduleAfterResponse(async () => {
				throw new Error("boom");
			}),
		).resolves.toBeUndefined();
	});
});
