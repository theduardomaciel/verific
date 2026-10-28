import { describe, expect, it } from "vitest";

import { assertActivityOpen, assertNotFullBeforeLock } from "./seats";

describe("assertNotFullBeforeLock", () => {
	const open = { participantsLimit: 50, cancelledAt: null };
	const outsider = { involved: false, enrolled: 0, openOffers: 0 };

	it("recusa quem chega com a atividade cheia", () => {
		let error: unknown;
		try {
			assertNotFullBeforeLock(open, { ...outsider, enrolled: 50 });
		} catch (caught) {
			error = caught;
		}
		expect(error).toMatchObject({ cause: { code: "ACTIVITY_FULL" } });
	});

	it("conta as ofertas em aberto como vagas ocupadas", () => {
		expect(() =>
			assertNotFullBeforeLock(open, {
				...outsider,
				enrolled: 48,
				openOffers: 2,
			}),
		).toThrow();
	});

	it("deixa passar quando sobra vaga", () => {
		expect(() =>
			assertNotFullBeforeLock(open, { ...outsider, enrolled: 49 }),
		).not.toThrow();
	});

	it("deixa para a trava quem já tem vínculo ou lugar na fila", () => {
		expect(() =>
			assertNotFullBeforeLock(open, {
				involved: true,
				enrolled: 50,
				openOffers: 3,
			}),
		).not.toThrow();
	});

	it("ignora atividade sem limite ou cancelada", () => {
		const full = { ...outsider, enrolled: 500 };
		expect(() =>
			assertNotFullBeforeLock(
				{ participantsLimit: null, cancelledAt: null },
				full,
			),
		).not.toThrow();
		expect(() =>
			assertNotFullBeforeLock(
				{ participantsLimit: 50, cancelledAt: new Date() },
				full,
			),
		).not.toThrow();
	});
});

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
