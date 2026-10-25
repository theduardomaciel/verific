import { describe, expect, it } from "vitest";

import { planSessionDiff } from "./session-diff";

const at = (hour: number) => new Date(Date.UTC(2026, 9, 24, hour, 0, 0));

function row(id: string, hour: number, address = "Sala 1") {
	return {
		id,
		startsAt: at(hour),
		endsAt: at(hour + 1),
		address,
	};
}

describe("planSessionDiff", () => {
	it("mantém a linha quando o id é enviado (check-ins sobrevivem)", () => {
		const existing = [row("a", 9), row("b", 11)];
		const plan = planSessionDiff(existing, [
			{ id: "a", startsAt: at(9), endsAt: at(10), address: "Sala 1" },
			{ id: "b", startsAt: at(11), endsAt: at(12), address: "Sala 1" },
		]);

		expect(plan.toDeleteIds).toEqual([]);
		expect(plan.toInsert).toEqual([]);
		expect(plan.toUpdate.map((session) => session.id)).toEqual(["a", "b"]);
	});

	it("atualiza no lugar quando o horário muda (não recria)", () => {
		const plan = planSessionDiff(
			[row("a", 9)],
			[{ id: "a", startsAt: at(10), endsAt: at(11), address: "Sala 1" }],
		);

		expect(plan.toUpdate).toEqual([
			{
				id: "a",
				startsAt: at(10),
				endsAt: at(11),
				address: "Sala 1",
			},
		]);
		expect(plan.toInsert).toEqual([]);
		expect(plan.toDeleteIds).toEqual([]);
	});

	it("adiciona uma sessão nova sem tocar nas existentes", () => {
		const plan = planSessionDiff(
			[row("a", 9)],
			[
				{ id: "a", startsAt: at(9), endsAt: at(10), address: "Sala 1" },
				{ startsAt: at(14), endsAt: at(15), address: "Sala 2" },
			],
		);

		expect(plan.toDeleteIds).toEqual([]);
		expect(plan.toUpdate.map((session) => session.id)).toEqual(["a"]);
		expect(plan.toInsert).toHaveLength(1);
	});

	it("remove apenas as sessões que saíram do payload", () => {
		const plan = planSessionDiff(
			[row("a", 9), row("b", 11)],
			[{ id: "a", startsAt: at(9), endsAt: at(10), address: "Sala 1" }],
		);

		expect(plan.toDeleteIds).toEqual(["b"]);
	});

	it("casa por conteúdo quando o cliente não envia ids", () => {
		const plan = planSessionDiff(
			[row("a", 9)],
			[{ startsAt: at(9), endsAt: at(10), address: "Sala 1" }],
		);

		expect(plan.toDeleteIds).toEqual([]);
		expect(plan.toInsert).toEqual([]);
	});

	it("não reutiliza a mesma linha duas vezes", () => {
		const plan = planSessionDiff(
			[row("a", 9)],
			[
				{ id: "a", startsAt: at(9), endsAt: at(10), address: "Sala 1" },
				{ startsAt: at(9), endsAt: at(10), address: "Sala 1" },
			],
		);

		expect(plan.toUpdate.map((session) => session.id)).toEqual(["a"]);
		expect(plan.toInsert).toHaveLength(1);
		expect(plan.toDeleteIds).toEqual([]);
	});
});
