import { APIError } from "better-auth/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@verific/auth", () => ({
	auth: { api: { getSession: getSessionMock } },
}));

import { getRefreshingSession } from "./session";

describe("getRefreshingSession", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sessão apagada durante a renovação vira sessão nula", async () => {
		getSessionMock.mockRejectedValue(
			APIError.from("UNAUTHORIZED", {
				message: "Failed to get session",
				code: "FAILED_TO_GET_SESSION",
			}),
		);

		await expect(getRefreshingSession()).resolves.toBeNull();
	});

	it("outros erros continuam sendo lançados", async () => {
		getSessionMock.mockRejectedValue(new Error("db down"));

		await expect(getRefreshingSession()).rejects.toThrow("db down");
	});
});
