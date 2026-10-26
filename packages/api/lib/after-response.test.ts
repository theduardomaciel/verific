import { beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({
	after: undefined as ((callback: () => unknown) => void) | undefined,
}));
vi.mock("next/server", () => ({
	get after() {
		return runtime.after;
	},
}));

import { scheduleAfterResponse } from "./after-response";

beforeEach(() => {
	runtime.after = undefined;
});

describe("scheduleAfterResponse", () => {
	it("runs the work inline without a Next runtime", async () => {
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

	it("hands the work's promise to after(), so the response waits for it", async () => {
		const after = vi.fn();
		runtime.after = after;
		let finished = false;

		await scheduleAfterResponse(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			finished = true;
		});
		expect(finished).toBe(false);

		await (after.mock.calls[0]![0] as () => unknown)();
		expect(finished).toBe(true);
	});
});
