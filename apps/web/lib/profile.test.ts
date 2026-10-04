import { describe, expect, it } from "vitest";

import {
	detectProfileDuplicates,
	profileInputSchema,
	profilePath,
	DEFAULT_PRIVACY,
} from "@verific/drizzle/profile";

describe("profile schema", () => {
	it("aplica privacidade padrão (e-mail e nascimento privados)", () => {
		expect(DEFAULT_PRIVACY.email).toBe("private");
		expect(DEFAULT_PRIVACY.birthDate).toBe("private");
		expect(DEFAULT_PRIVACY.github).toBe("public");
	});

	it("aceita perfil mínimo vazio", () => {
		const parsed = profileInputSchema.safeParse({});
		expect(parsed.success).toBe(true);
	});

	it("rejeita URL social inválida", () => {
		const parsed = profileInputSchema.safeParse({
			socials: [{ network: "github", url: "não-url" }],
		});
		expect(parsed.success).toBe(false);
	});

	it("detecta campos duplicados em pt-BR", () => {
		const dups = detectProfileDuplicates([
			{ id: "1", label: "Universidade onde estuda" },
			{ id: "2", label: "Cor favorita" },
			{ id: "3", label: "Seu GitHub" },
		]);
		expect(dups.map((d) => d.fieldId).sort()).toEqual(["1", "3"]);
	});

	it("monta o caminho do perfil", () => {
		expect(profilePath("secomp", "abc123")).toBe("/secomp/profile/abc123");
	});
});
