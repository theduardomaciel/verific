import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { publishJSONMock } = vi.hoisted(() => ({ publishJSONMock: vi.fn() }));

vi.mock("@upstash/qstash", () => ({
	Client: class {
		publishJSON = publishJSONMock;
	},
}));

vi.mock("@verific/env", () => ({
	env: { QSTASH_TOKEN: "token", QSTASH_CURRENT_SIGNING_KEY: "current" },
}));

vi.mock("../notifications/urls", () => ({
	emailUrl: (path: string) => `https://app.example${path}`,
}));

import { createQStashScheduler } from "./qstash";

const DAY = 24 * 60 * 60 * 1000;
const OFFERED_AT = "2026-11-01T12:00:00.000Z";
const EXPIRES_AT = new Date(Date.parse(OFFERED_AT) + 7 * DAY).toISOString();

describe("createQStashScheduler", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		publishJSONMock.mockReset().mockResolvedValue({ messageId: "m" });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("o reagendamento após o teto de 6 dias não reusa o id de deduplicação", async () => {
		const scheduler = createQStashScheduler();
		const args = {
			enrollmentId: "entry-1",
			activityId: "act-1",
			offeredAt: OFFERED_AT,
			expiresAt: EXPIRES_AT,
		};

		vi.setSystemTime(new Date(OFFERED_AT));
		await scheduler.schedule(args);
		// A entrega limitada a 6 dias chega antes do prazo e reagenda
		vi.setSystemTime(new Date(Date.parse(OFFERED_AT) + 6 * DAY));
		await scheduler.schedule(args);

		const [first, second] = publishJSONMock.mock.calls.map(
			(call) => call[0] as { deduplicationId: string; notBefore: number },
		);
		expect(first!.notBefore).toBe(
			Math.ceil((Date.parse(OFFERED_AT) + 6 * DAY) / 1000),
		);
		expect(second!.notBefore).toBe(
			Math.ceil(Date.parse(EXPIRES_AT) / 1000),
		);
		expect(first!.deduplicationId).not.toBe(second!.deduplicationId);
	});
});
