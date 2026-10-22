import { NextRequest } from "next/server";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { entryRows, lockActivityMock, settleActivityMock, scheduleMock } =
	vi.hoisted(() => ({
		entryRows: [] as unknown[],
		lockActivityMock: vi.fn(),
		settleActivityMock: vi.fn(),
		scheduleMock: vi.fn(),
	}));

vi.mock("@upstash/qstash", () => ({
	Receiver: class {
		verify = vi.fn().mockResolvedValue(true);
	},
}));

vi.mock("@verific/env", () => ({
	env: { QSTASH_CURRENT_SIGNING_KEY: "current" },
}));

vi.mock("@verific/drizzle", () => ({
	db: {
		select: () => ({ from: () => ({ where: async () => entryRows }) }),
		transaction: async (fn: (tx: unknown) => unknown) => fn({}),
	},
}));

vi.mock("@verific/api/seats", () => ({ lockActivity: lockActivityMock }));
vi.mock("@verific/api/waitlist", () => ({
	settleActivity: settleActivityMock,
}));
vi.mock("@verific/api/scheduler", () => ({
	getOfferExpiryScheduler: () => ({ schedule: scheduleMock }),
}));

import { POST } from "./route";

const OFFERED_AT = new Date("2026-11-10T10:00:00Z");

function deliver(expiresAt: Date) {
	return POST(
		new NextRequest("http://localhost/api/jobs/offer-expiry", {
			method: "POST",
			headers: { "upstash-signature": "sig" },
			body: JSON.stringify({
				enrollmentId: "entry-1",
				activityId: "act-1",
				offeredAt: OFFERED_AT.toISOString(),
				expiresAt: expiresAt.toISOString(),
			}),
		}),
	);
}

describe("/api/jobs/offer-expiry", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		entryRows.length = 0;
		entryRows.push({
			id: "entry-1",
			status: "offered",
			offeredAt: OFFERED_AT,
		});
		lockActivityMock.mockResolvedValue({ id: "act-1" });
	});

	it("entrega adiantada dentro da tolerância acerta a fila no prazo", async () => {
		const expiresAt = new Date(Date.now() + 60_000);

		const res = await deliver(expiresAt);

		expect(await res.json()).toEqual({ status: "settled" });
		expect(settleActivityMock).toHaveBeenCalledWith(
			{},
			{ id: "act-1" },
			expiresAt,
		);
	});

	it("entrega atrasada acerta a fila com a hora atual", async () => {
		const before = Date.now();

		await deliver(new Date(before - 60_000));

		const settleAt = settleActivityMock.mock.calls[0]![2] as Date;
		expect(settleAt.getTime()).toBeGreaterThanOrEqual(before);
	});

	it("entrega muito adiantada reagenda sem acertar a fila", async () => {
		const res = await deliver(new Date(Date.now() + 60 * 60_000));

		expect((await res.json()).status).toBe("re-scheduled");
		expect(scheduleMock).toHaveBeenCalledTimes(1);
		expect(settleActivityMock).not.toHaveBeenCalled();
	});

	it("oferta já resolvida ou reofertada não faz nada", async () => {
		entryRows[0] = {
			id: "entry-1",
			status: "expired",
			offeredAt: OFFERED_AT,
		};
		expect((await (await deliver(new Date())).json()).reason).toBe(
			"not-offered",
		);

		entryRows[0] = {
			id: "entry-1",
			status: "offered",
			offeredAt: new Date("2026-11-11T10:00:00Z"),
		};
		expect((await (await deliver(new Date())).json()).reason).toBe(
			"re-offered",
		);
		expect(settleActivityMock).not.toHaveBeenCalled();
	});
});
