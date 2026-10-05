import { describe, expect, it } from "vitest";

import {
	detectProfileDuplicates,
	profileInputSchema,
	profilePath,
	DEFAULT_PRIVACY,
} from "@verific/drizzle/profile";
import {
	githubHandle,
	socialUrl,
	isFilled,
} from "@/components/forms/profile-normalize";

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

	it("não confunde substrings: cidade/atividades não são nascimento", () => {
		const dups = detectProfileDuplicates([
			{ id: "1", label: "Cidade de Residência" },
			{ id: "2", label: "De quais atividades pretende participar?" },
		]);
		expect(dups.map((d) => d.fieldId)).toEqual(["1"]);
		expect(dups[0]?.profileField).toBe("Cidade");
	});

	it("monta o caminho do perfil", () => {
		expect(profilePath("secomp", "abc123")).toBe("/secomp/profile/abc123");
	});
});

describe("profile normalize", () => {
	it("extrai handle do GitHub de usuário ou URL", () => {
		expect(githubHandle("fulana")).toBe("fulana");
		expect(githubHandle("@fulana")).toBe("fulana");
		expect(githubHandle("https://github.com/fulana")).toBe("fulana");
		expect(githubHandle("github.com/fulana?tab=repos")).toBe("fulana");
		expect(githubHandle("")).toBeNull();
	});

	it("aceita usuário ou URL nas redes", () => {
		expect(socialUrl("fulana", "https://instagram.com/")).toBe(
			"https://instagram.com/fulana",
		);
		expect(socialUrl("@fulana", "https://instagram.com/")).toBe(
			"https://instagram.com/fulana",
		);
		expect(socialUrl("https://instagram.com/fulana")).toBe(
			"https://instagram.com/fulana",
		);
		expect(socialUrl("instagram.com/fulana")).toBe(
			"https://instagram.com/fulana",
		);
		expect(socialUrl("", "https://instagram.com/")).toBeNull();
	});

	it("mede preenchimento", () => {
		expect(isFilled("x")).toBe(true);
		expect(isFilled("")).toBe(false);
		expect(isFilled(["a"])).toBe(true);
		expect(isFilled([])).toBe(false);
		expect(isFilled(true)).toBe(true);
		expect(isFilled(false)).toBe(false);
		expect(isFilled(null)).toBe(false);
	});
});
