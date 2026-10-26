import { NextRequest } from "next/server";

import { describe, expect, it, vi } from "vitest";

vi.mock("@verific/api", async () => {
	const { initTRPC } = await import("@trpc/server");
	const t = initTRPC.create();
	return {
		appRouter: t.router({
			ping: t.procedure.query(() => "pong"),
		}),
		PUBLIC_CACHEABLE_QUERY_PATHS: new Set(["ping"]),
	};
});
vi.mock("@/lib/session", () => ({ getRefreshingSession: async () => null }));
vi.mock("@/lib/server-cache-invalidation", () => ({}));

import { GET, POST } from "./route";

describe("rota do tRPC", () => {
	it("responde 404, não 500, a um path com % inválido", async () => {
		const response = await GET(
			new NextRequest("http://localhost/api/trpc/%E0%A4%A"),
		);

		expect(response.status).toBe(404);
	});

	it("serve a query pública", async () => {
		const response = await GET(
			new NextRequest("http://localhost/api/trpc/ping"),
		);

		expect(response.status).toBe(200);
	});

	it("responde a query enviada por POST sem cache de borda", async () => {
		const response = await POST(
			new NextRequest("http://localhost/api/trpc/ping?batch=1", {
				method: "POST",
				body: JSON.stringify({ 0: {} }),
				headers: { "content-type": "application/json" },
			}),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
		expect(response.headers.get("CDN-Cache-Control")).toBeNull();
	});
});
