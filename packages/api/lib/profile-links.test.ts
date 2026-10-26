import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { parseProfileLayout } from "@verific/drizzle/profile-layout";

vi.mock("@verific/drizzle", () => ({ db: {} }));

import { relinkLayout } from "./profile-links";

const old = { subtitle: randomUUID(), bio: randomUUID(), stat: randomUUID() };
const b1 = randomUUID();
const b2 = randomUUID();
const b3 = randomUUID();
const linked = [
	{ id: old.subtitle, key: "curso", type: "text" },
	{ id: old.bio, key: "sobre", type: "textarea" },
	{ id: old.stat, key: "idade", type: "number" },
];
const layout = parseProfileLayout({
	subtitleFieldId: old.subtitle,
	bioFieldId: old.bio,
	stats: [{ fieldId: old.stat, label: "Idade", icon: "star" }],
});

describe("relinkLayout", () => {
	it("leva cada link ao campo de mesma chave da nova versão", () => {
		const next = relinkLayout(layout, linked, [
			{ id: b1, key: "curso", type: "text" },
			{ id: b2, key: "sobre", type: "textarea" },
			{ id: b3, key: "idade", type: "number" },
		]);

		expect(next.subtitleFieldId).toBe(b1);
		expect(next.bioFieldId).toBe(b2);
		expect(next.stats.map((s) => s.fieldId)).toEqual([b3]);
	});

	it("tira o link da pergunta que saiu ou mudou para um tipo incompatível", () => {
		const next = relinkLayout(layout, linked, [
			{ id: b1, key: "curso", type: "select_single" },
			{ id: b3, key: "idade", type: "number" },
		]);

		expect(next.subtitleFieldId).toBeNull();
		expect(next.bioFieldId).toBeNull();
		expect(next.stats.map((s) => s.fieldId)).toEqual([b3]);
	});

	it("com `only`, mexe só nos links desses campos", () => {
		const next = relinkLayout(
			layout,
			linked,
			[{ id: b2, key: "sobre", type: "textarea" }],
			new Set([old.bio]),
		);

		expect(next.subtitleFieldId).toBe(old.subtitle);
		expect(next.bioFieldId).toBe(b2);
		expect(next.stats.map((s) => s.fieldId)).toEqual([old.stat]);
	});
});
