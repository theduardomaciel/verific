import { describe, expect, it } from "vitest";

import {
	planSettlement,
	seatsTaken,
	type WaitlistEntryState,
} from "./waitlist-plan";

const NOW = new Date("2026-11-10T12:00:00-03:00");
const STARTS = new Date("2026-11-12T14:00:00-03:00");
const ENDS = new Date("2026-11-12T16:00:00-03:00");

function waiting(id: string, joinedIso: string): WaitlistEntryState {
	return {
		id,
		participantId: `p-${id}`,
		status: "waiting",
		joinedAt: new Date(joinedIso),
		offerExpiresAt: null,
	};
}

function offered(id: string, expiresIso: string): WaitlistEntryState {
	return {
		id,
		participantId: `p-${id}`,
		status: "offered",
		joinedAt: new Date("2026-11-01T10:00:00-03:00"),
		offerExpiresAt: new Date(expiresIso),
	};
}

const base = {
	limit: 10,
	enrolled: 10,
	entries: [] as WaitlistEntryState[],
	now: NOW,
	startsAt: STARTS,
	endsAt: ENDS,
	offerHours: 12,
};

describe("planSettlement", () => {
	it("não faz nada com a atividade lotada", () => {
		const plan = planSettlement({
			...base,
			entries: [waiting("a", "2026-11-05T10:00:00-03:00")],
		});

		expect(plan).toEqual({ expire: [], revoke: [], offer: [] });
	});

	it("oferece as vagas livres pela ordem de entrada", () => {
		const plan = planSettlement({
			...base,
			enrolled: 8,
			entries: [
				waiting("late", "2026-11-06T10:00:00-03:00"),
				waiting("first", "2026-11-04T10:00:00-03:00"),
				waiting("second", "2026-11-05T10:00:00-03:00"),
			],
		});

		expect(plan.offer.map((o) => o.id)).toEqual(["first", "second"]);
		expect(plan.offer[0]?.expiresAt).toEqual(
			new Date("2026-11-11T00:00:00-03:00"),
		);
	});

	it("devolve à fila as últimas ofertas quando o limite baixa", () => {
		const first = offered("first", "2026-11-10T20:00:00-03:00");
		const last = {
			...offered("last", "2026-11-10T20:00:00-03:00"),
			joinedAt: new Date("2026-11-02T10:00:00-03:00"),
		};

		const plan = planSettlement({
			...base,
			limit: 8,
			enrolled: 7,
			entries: [last, first, waiting("w", "2026-11-03T10:00:00-03:00")],
		});

		expect(plan).toEqual({ expire: [], revoke: ["last"], offer: [] });
	});

	it("conta ofertas em aberto como vagas ocupadas", () => {
		const plan = planSettlement({
			...base,
			enrolled: 9,
			entries: [
				offered("held", "2026-11-10T20:00:00-03:00"),
				waiting("next", "2026-11-05T10:00:00-03:00"),
			],
		});

		expect(plan).toEqual({ expire: [], revoke: [], offer: [] });
	});

	it("passa a oferta vencida para o próximo", () => {
		const plan = planSettlement({
			...base,
			enrolled: 9,
			entries: [
				offered("stale", "2026-11-10T11:59:00-03:00"),
				waiting("next", "2026-11-05T10:00:00-03:00"),
			],
		});

		expect(plan.expire).toEqual(["stale"]);
		expect(plan.offer.map((o) => o.id)).toEqual(["next"]);
	});

	it("termina o prazo no início da atividade", () => {
		const plan = planSettlement({
			...base,
			enrolled: 9,
			now: new Date("2026-11-12T09:00:00-03:00"),
			entries: [waiting("a", "2026-11-05T10:00:00-03:00")],
		});

		expect(plan.offer).toEqual([{ id: "a", expiresAt: STARTS }]);
	});

	it("não faz ofertas depois do início, mas expira as vencidas", () => {
		const plan = planSettlement({
			...base,
			enrolled: 5,
			now: new Date("2026-11-12T14:30:00-03:00"),
			entries: [
				offered("stale", "2026-11-12T14:00:00-03:00"),
				waiting("a", "2026-11-05T10:00:00-03:00"),
			],
		});

		expect(plan).toEqual({ expire: ["stale"], revoke: [], offer: [] });
	});

	it("encerra a fila inteira quando a atividade acaba", () => {
		const plan = planSettlement({
			...base,
			enrolled: 0,
			now: ENDS,
			entries: [
				offered("o", "2026-11-12T14:00:00-03:00"),
				waiting("w", "2026-11-05T10:00:00-03:00"),
			],
		});

		expect(plan).toEqual({ expire: ["o", "w"], revoke: [], offer: [] });
	});

	it("oferece a todos quando o limite é removido", () => {
		const plan = planSettlement({
			...base,
			limit: null,
			entries: [
				waiting("a", "2026-11-05T10:00:00-03:00"),
				waiting("b", "2026-11-06T10:00:00-03:00"),
			],
		});

		expect(plan.offer.map((o) => o.id)).toEqual(["a", "b"]);
	});

	it("não oferece nada quando há mais inscritos que vagas", () => {
		const plan = planSettlement({
			...base,
			limit: 5,
			enrolled: 8,
			entries: [waiting("a", "2026-11-05T10:00:00-03:00")],
		});

		expect(plan.offer).toEqual([]);
	});

	it("usa só o prazo em horas quando não há sessões", () => {
		const plan = planSettlement({
			...base,
			enrolled: 9,
			startsAt: null,
			endsAt: null,
			offerHours: 2,
			entries: [waiting("a", "2026-11-05T10:00:00-03:00")],
		});

		expect(plan.offer).toEqual([
			{ id: "a", expiresAt: new Date("2026-11-10T14:00:00-03:00") },
		]);
	});
});

describe("seatsTaken", () => {
	it("sem limite conta só inscritos e ofertas vigentes", () => {
		expect(
			seatsTaken({ limit: null, enrolled: 4, openOffers: 1, waiting: 0 }),
		).toBe(5);
	});

	it("oferta vencida sem fila libera a vaga", () => {
		expect(
			seatsTaken({ limit: 1, enrolled: 0, openOffers: 0, waiting: 0 }),
		).toBe(0);
	});

	it("vaga livre com gente na fila fica com a fila", () => {
		expect(
			seatsTaken({ limit: 3, enrolled: 1, openOffers: 0, waiting: 1 }),
		).toBe(2);
		expect(
			seatsTaken({ limit: 3, enrolled: 1, openOffers: 0, waiting: 5 }),
		).toBe(3);
	});

	it("limite abaixo dos ocupados não esconde quem já tem vaga", () => {
		expect(
			seatsTaken({ limit: 2, enrolled: 3, openOffers: 1, waiting: 2 }),
		).toBe(4);
	});

	it("bate com o que o acerto da fila faria antes do início", () => {
		for (const limit of [1, 2, 5]) {
			for (let enrolled = 0; enrolled <= limit + 1; enrolled++) {
				for (let open = 0; open <= 2; open++) {
					for (let expired = 0; expired <= 2; expired++) {
						for (let queued = 0; queued <= 3; queued++) {
							const entries = [
								...Array.from({ length: open }, (_, i) =>
									offered(
										`o${i}`,
										"2026-11-10T20:00:00-03:00",
									),
								),
								...Array.from({ length: expired }, (_, i) =>
									offered(
										`x${i}`,
										"2026-11-10T11:00:00-03:00",
									),
								),
								...Array.from({ length: queued }, (_, i) =>
									waiting(
										`w${i}`,
										"2026-11-05T10:00:00-03:00",
									),
								),
							];
							const plan = planSettlement({
								...base,
								limit,
								enrolled,
								entries,
							});

							expect(
								seatsTaken({
									limit,
									enrolled,
									openOffers: open,
									waiting: queued,
								}),
							).toBe(enrolled + open + plan.offer.length);
						}
					}
				}
			}
		}
	});
});
