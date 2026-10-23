import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
	it("mantém caminhos da própria origem com query e hash", () => {
		expect(safeRedirectPath("/dashboard", "/x")).toBe("/dashboard");
		expect(safeRedirectPath("/evento/schedule?dia=2#abc", "/x")).toBe(
			"/evento/schedule?dia=2#abc",
		);
		expect(safeRedirectPath("/%5Cevil.com", "/x")).toBe("/%5Cevil.com");
	});

	it("recusa destinos em outro domínio", () => {
		for (const value of [
			"//evil.com",
			"/\\evil.com",
			"/\\/evil.com",
			"https://evil.com",
			"javascript:alert(1)",
			"evil.com",
		]) {
			expect(safeRedirectPath(value, "/x")).toBe("/x");
		}
	});

	it("recusa segmentos de ponto que normalizam para //host", () => {
		for (const value of [
			"/.//evil.com",
			"/..//evil.com",
			"/%2e%2e//evil.com",
			"/a/..//evil.com",
		]) {
			expect(safeRedirectPath(value, "/x")).toBe("/x");
		}
	});

	it("recusa caracteres de controle", () => {
		expect(safeRedirectPath("/\t/evil.com", "/x")).toBe("/x");
		expect(safeRedirectPath("/\n/evil.com", "/x")).toBe("/x");
	});

	it("usa o fallback sem valor", () => {
		expect(safeRedirectPath("", "/x")).toBe("/x");
		expect(safeRedirectPath(null, "/x")).toBe("/x");
		expect(safeRedirectPath(undefined, "/x")).toBe("/x");
	});
});
