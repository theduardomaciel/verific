import { NextRequest } from "next/server";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runSweepMock } = vi.hoisted(() => ({ runSweepMock: vi.fn() }));

vi.mock("@verific/api/notifications/service", () => ({
	runSweep: runSweepMock,
}));

import { GET, POST } from "./route";

const SECRET = "s".repeat(32);

function request(method: string, authorization?: string) {
	return new NextRequest("http://localhost/api/cron/sweep", {
		method,
		headers: authorization ? { authorization } : {},
	});
}

describe("/api/cron/sweep", () => {
	beforeEach(() => {
		vi.stubEnv("CRON_SECRET", SECRET);
		runSweepMock.mockReset().mockResolvedValue({ settled: 0 });
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("o GET do Vercel Cron com o segredo roda a varredura", async () => {
		const res = await GET(request("GET", `Bearer ${SECRET}`));

		expect(res.status).toBe(200);
		expect(runSweepMock).toHaveBeenCalledTimes(1);
	});

	it("POST continua aceito", async () => {
		const res = await POST(request("POST", `Bearer ${SECRET}`));

		expect(res.status).toBe(200);
		expect(runSweepMock).toHaveBeenCalledTimes(1);
	});

	it("recusa sem cabeçalho ou com segredo errado", async () => {
		expect((await GET(request("GET"))).status).toBe(401);
		expect(
			(await GET(request("GET", `Bearer ${"x".repeat(32)}`))).status,
		).toBe(401);
		expect(runSweepMock).not.toHaveBeenCalled();
	});
});
