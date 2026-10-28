import { NextRequest } from "next/server";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyMock, processScheduledRetryMock } = vi.hoisted(() => ({
	verifyMock: vi.fn(),
	processScheduledRetryMock: vi.fn(),
}));

vi.mock("@upstash/qstash", () => ({
	Receiver: class {
		verify = verifyMock;
	},
}));

vi.mock("@verific/env", () => ({
	env: { QSTASH_CURRENT_SIGNING_KEY: "current" },
}));

vi.mock("@verific/api/notifications/service", () => ({
	processScheduledRetry: processScheduledRetryMock,
}));

import { POST } from "./route";

function deliver(body: unknown, signature: string | null = "sig") {
	return POST(
		new NextRequest("http://localhost/api/jobs/notification-retry", {
			method: "POST",
			headers: signature ? { "upstash-signature": signature } : {},
			body: JSON.stringify(body),
		}),
	);
}

describe("/api/jobs/notification-retry", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		verifyMock.mockResolvedValue(true);
		processScheduledRetryMock.mockResolvedValue({ status: "processed" });
	});

	it("reprocessa a notificação da entrega", async () => {
		const res = await deliver({ notificationId: "n1", round: 2 });

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ status: "processed" });
		expect(processScheduledRetryMock).toHaveBeenCalledWith("n1");
	});

	it("recusa entrega sem assinatura válida", async () => {
		verifyMock.mockRejectedValue(new Error("bad signature"));

		const res = await deliver({ notificationId: "n1", round: 2 });

		expect(res.status).toBe(401);
		expect(processScheduledRetryMock).not.toHaveBeenCalled();
	});

	it("corpo sem notificationId vira no-op, sem nova entrega", async () => {
		const res = await deliver({ round: 2 });

		expect(res.status).toBe(200);
		expect(processScheduledRetryMock).not.toHaveBeenCalled();
	});

	it("erro inesperado devolve 500 para o QStash tentar de novo", async () => {
		processScheduledRetryMock.mockRejectedValue(new Error("db down"));

		const res = await deliver({ notificationId: "n1", round: 2 });

		expect(res.status).toBe(500);
	});
});
