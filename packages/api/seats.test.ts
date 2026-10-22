import { describe, expect, it } from "vitest";

import { assertActivityOpen } from "./seats";

describe("assertActivityOpen", () => {
	it("deixa passar atividade ativa", () => {
		expect(() => assertActivityOpen({ cancelledAt: null })).not.toThrow();
	});

	it("recusa atividade cancelada como inscrições encerradas", () => {
		let error: unknown;
		try {
			assertActivityOpen({
				cancelledAt: new Date("2026-11-01T00:00:00Z"),
			});
		} catch (caught) {
			error = caught;
		}
		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "REGISTRATION_CLOSED" },
		});
	});
});
