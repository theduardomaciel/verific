import { describe, expect, it } from "vitest";

import { planFormSections } from "./layout";

const sec = (id: string, order: number, isSystem: string | null = null) => ({
	id,
	title: id,
	order,
	isSystem,
});
const grp = (id: string, order: number, isSystem: string | null = null) => ({
	section: sec(id, order, isSystem),
	fields: [],
	rows: [],
});

describe("planFormSections", () => {
	it("interpola a seção de sistema na ordem e numera", () => {
		const planned = planFormSections(
			[grp("a", 0), grp("sys", 1, "profile"), grp("b", 2)],
			true,
		);
		expect(planned.map((p) => p.group.section.id)).toEqual([
			"a",
			"sys",
			"b",
		]);
		expect(planned.map((p) => p.displayNumber)).toEqual([1, 2, 3]);
		expect(planned[1]?.isProfile).toBe(true);
		expect(planned[0]?.isFirstContent).toBe(true);
		expect(planned[2]?.isFirstContent).toBe(false);
	});

	it("pula a sistema quando oculta e renumera", () => {
		const planned = planFormSections(
			[grp("sys", 0, "profile"), grp("a", 1)],
			false,
		);
		expect(planned.map((p) => p.group.section.id)).toEqual(["a"]);
		expect(planned[0]?.displayNumber).toBe(1);
		expect(planned[0]?.isFirstContent).toBe(true);
	});

	it("nome fica na primeira seção de conteúdo mesmo com perfil antes", () => {
		const planned = planFormSections(
			[grp("sys", 0, "profile"), grp("terms", 1)],
			true,
		);
		expect(planned.find((p) => p.isFirstContent)?.group.section.id).toBe(
			"terms",
		);
	});
});
