import { describe, expect, it } from "vitest";

import {
	detectProfileDuplicates,
	profileInputSchema,
	profilePath,
	shouldShowProfileAtSignup,
	DEFAULT_PRIVACY,
} from "@verific/drizzle/profile";
import {
	githubHandle,
	socialUrl,
	isFilled,
} from "@/components/forms/profile-normalize";
import {
	normalizeSocialLink,
	socialDisplayHandle,
	parseProfileLayout,
	isCompatible,
	isFieldLinked,
	slotForField,
} from "@verific/drizzle/profile-layout";

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

	it("uma fonte da verdade p/ exibir perfil na inscrição", () => {
		expect(
			shouldShowProfileAtSignup({ profilesEnabled: true, profileFillAtSignup: true }),
		).toBe(true);
		expect(
			shouldShowProfileAtSignup({ profilesEnabled: true, profileFillAtSignup: false }),
		).toBe(false);
		expect(shouldShowProfileAtSignup({ profilesEnabled: false })).toBe(false);
		expect(shouldShowProfileAtSignup(null)).toBe(false);
		expect(shouldShowProfileAtSignup({ profilesEnabled: true })).toBe(true);
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

describe("shared social normalize", () => {
	it("normaliza handle e URL (inclusive Lattes http)", () => {
		expect(normalizeSocialLink("github", "fulana")).toBe(
			"https://github.com/fulana",
		);
		expect(normalizeSocialLink("lattes", "0993964740433171")).toBe(
			"http://lattes.cnpq.br/0993964740433171",
		);
		expect(
			normalizeSocialLink("lattes", "lattes.cnpq.br/0993964740433171"),
		).toBe("http://lattes.cnpq.br/0993964740433171");
		expect(normalizeSocialLink("github", "")).toBeNull();
		expect(normalizeSocialLink("unknown", "x")).toBeNull();
	});

	it("extrai handle p/ exibição", () => {
		expect(socialDisplayHandle("https://github.com/fulana")).toBe("fulana");
		expect(socialDisplayHandle("http://lattes.cnpq.br/0993964740433171")).toBe(
			"0993964740433171",
		);
	});
});

describe("profile layout", () => {
	const F_SUB = "11111111-1111-4111-8111-111111111111";
	const F_CITY = "22222222-2222-4222-8222-222222222222";
	const layout = parseProfileLayout({
		version: 1,
		subtitleFieldId: F_SUB,
		bioFieldId: null,
		stats: [{ fieldId: F_CITY, label: "Cidade", icon: "map-pin" }],
		socialsFieldId: null,
		emailFieldId: null,
		connectionsEnabled: true,
		badgesEnabled: false,
	});

	it("resolve slots e compatibilidade", () => {
		expect(slotForField(layout, F_SUB)).toMatchObject({ slot: "subtitle" });
		expect(slotForField(layout, F_CITY)).toMatchObject({
			slot: "stats",
			statIndex: 0,
		});
		expect(slotForField(layout, "nope")).toBeNull();
		expect(isFieldLinked(layout, F_SUB)).toBe(true);
		expect(isFieldLinked(layout, "nope")).toBe(false);
		expect(isCompatible("subtitle", "text")).toBe(true);
		expect(isCompatible("subtitle", "textarea")).toBe(false);
		expect(isCompatible("bio", "text")).toBe(true);
		expect(isCompatible("socials", "social_links")).toBe(true);
	});

	it("aplica padrões", () => {
		const d = parseProfileLayout(null);
		expect(d.stats).toEqual([]);
		expect(d.connectionsEnabled).toBe(true);
		expect(d.badgesEnabled).toBe(false);
	});
});
