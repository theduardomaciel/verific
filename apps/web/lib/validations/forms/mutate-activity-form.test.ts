import { describe, expect, it } from "vitest";

import { mutateActivityFormSchema } from "./mutate-activity-form";

const valid = {
	name: "Oficina",
	category: "workshop",
	sessions: [{ date: "2026-11-10", timeFrom: "14:00", timeTo: "16:00" }],
};

function parseLimit(participantsLimit: unknown) {
	return mutateActivityFormSchema.safeParse({ ...valid, participantsLimit });
}

describe("mutateActivityFormSchema.participantsLimit", () => {
	it("campo vazio vira sem limite", () => {
		const result = parseLimit("");
		expect(result.success).toBe(true);
		expect(result.data?.participantsLimit).toBeNull();
	});

	it("aceita nulo e ausência", () => {
		expect(parseLimit(null).data?.participantsLimit).toBeNull();
		expect(parseLimit(undefined).data?.participantsLimit).toBeUndefined();
	});

	it("aceita inteiros a partir de 1, sem teto", () => {
		expect(parseLimit("150").data?.participantsLimit).toBe(150);
		expect(parseLimit(1).data?.participantsLimit).toBe(1);
	});

	it("recusa zero, negativos e frações", () => {
		for (const value of ["0", "-3", "2.5"]) {
			expect(parseLimit(value).success).toBe(false);
		}
	});
});
