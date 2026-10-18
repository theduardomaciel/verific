import { describe, expect, it } from "vitest";

import { removeMatchingItems } from "@/lib/trpc/optimistic";

const page = {
	activities: [{ id: "a" }, { id: "b" }],
	pageCount: 1,
	amount: 2,
};

describe("removeMatchingItems", () => {
	it("remove o item que casa e decrementa o total", () => {
		const result = removeMatchingItems(
			page,
			"activities",
			(activity) => activity.id === "a",
		);

		expect(result.activities).toEqual([{ id: "b" }]);
		expect(result.amount).toBe(1);
		expect(result.pageCount).toBe(1);
	});

	it("não muda nada quando nenhum item casa", () => {
		const result = removeMatchingItems(
			page,
			"activities",
			(activity) => activity.id === "z",
		);

		expect(result).toBe(page);
	});

	it("não mexe na página original", () => {
		removeMatchingItems(
			page,
			"activities",
			(activity) => activity.id === "a",
		);

		expect(page.activities).toHaveLength(2);
		expect(page.amount).toBe(2);
	});

	it("nunca deixa o total negativo", () => {
		const result = removeMatchingItems(
			{ participants: [{ id: "p" }], amount: 0 },
			"participants",
			(participant) => participant.id === "p",
		);

		expect(result.amount).toBe(0);
		expect(result.participants).toEqual([]);
	});
});
