import { afterEach, describe, expect, it, vi } from "vitest";

const { userProfileRefsMock } = vi.hoisted(() => ({
	userProfileRefsMock: vi.fn(async () => [
		{ projectId: "project-1", shortId: "abc123" },
	]),
}));

vi.mock("./lib/user-public-scope", () => ({
	userProfileRefs: userProfileRefsMock,
	userOwnedProjectIds: async () => ["project-2"],
}));

import {
	emitAuthUserChanged,
	isAuthIdentityEndpoint,
	offAuthUserChanged,
	onAuthUserChanged,
	type AuthUserChange,
} from "@verific/auth/cache-hooks";

import {
	__unregisterCacheRevalidator,
	invalidateAuthUserChange,
	registerCacheRevalidator,
} from "./cache-invalidation";

/**
 * Ponte better-auth → cache público, exatamente como montada em
 * `apps/web/lib/server-cache-invalidation.ts`: o handler `/api/auth/*`
 * emite uma mudança de usuário, o ouvinte mapeia para as tags públicas, e
 * o revalidator do Next as derruba.
 *
 * Aqui o `emit` do better-auth é simulado (o hook de banco real é da lib);
 * o que se prova é que a corrente termina nas tags certas — o elo que,
 * antes, faltava para escritas de identidade fora do tRPC.
 */

describe("ponte de cache do better-auth", () => {
	afterEach(() => {
		__unregisterCacheRevalidator();
	});

	it("uma edição do usuário derruba só os perfis e eventos dele", async () => {
		const seen: string[] = [];
		registerCacheRevalidator((tag) => seen.push(tag));
		const listener = (change: AuthUserChange) =>
			invalidateAuthUserChange(change);
		onAuthUserChanged(listener);

		try {
			await emitAuthUserChanged({ reason: "update", userId: "user-1" });
		} finally {
			offAuthUserChanged(listener);
		}

		expect(userProfileRefsMock).toHaveBeenCalledWith("user-1");
		expect(seen).toEqual([
			"participant-profile:project-1:abc123",
			"project:project-2",
		]);
	});

	it("se a busca das tags do usuário falhar, derruba events+profiles", async () => {
		const seen: string[] = [];
		registerCacheRevalidator((tag) => seen.push(tag));
		userProfileRefsMock.mockRejectedValueOnce(new Error("db down"));

		await invalidateAuthUserChange({ reason: "update", userId: "user-1" });

		expect(seen).toEqual(["events", "profiles"]);
	});

	it("exclusão de conta derruba events+profiles", async () => {
		const seen: string[] = [];
		registerCacheRevalidator((tag) => seen.push(tag));
		const listener = (change: AuthUserChange) =>
			invalidateAuthUserChange(change);
		onAuthUserChanged(listener);

		try {
			await emitAuthUserChanged({ reason: "delete", userId: "user-1" });
		} finally {
			offAuthUserChanged(listener);
		}

		expect(seen).toEqual(["events", "profiles"]);
	});

	it("um erro de ouvinte nunca derruba a mutation de auth", async () => {
		const boom = vi.fn(() => {
			throw new Error("boom");
		});
		const ok = vi.fn();
		onAuthUserChanged(boom);
		onAuthUserChanged(ok);

		try {
			await expect(
				emitAuthUserChanged({ reason: "update", userId: "user-1" }),
			).resolves.toBeUndefined();
		} finally {
			offAuthUserChanged(boom);
			offAuthUserChanged(ok);
		}

		expect(boom).toHaveBeenCalledTimes(1);
		expect(ok).toHaveBeenCalledTimes(1);
	});
});

describe("filtro de endpoints de identidade", () => {
	it("aceita as edições do usuário (com e sem prefixo)", () => {
		for (const path of [
			"/update-user",
			"/change-email",
			"/delete-user",
			"/api/auth/update-user",
			"/api/auth/change-email?x=1",
		]) {
			expect(isAuthIdentityEndpoint(path)).toBe(true);
		}
	});

	it("ignora updates internos do login", () => {
		for (const path of [
			"/callback/google",
			"/sign-in/social",
			"/verify-email",
			"/link-social",
			"/get-session",
			undefined,
			null,
			"",
		]) {
			expect(isAuthIdentityEndpoint(path)).toBe(false);
		}
	});
});
