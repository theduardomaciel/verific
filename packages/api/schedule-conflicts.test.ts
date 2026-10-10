import { describe, expect, it } from "vitest";

import {
	findScheduleConflicts,
	type ConflictActivityLike,
} from "./schedule-conflicts";

const NOW = new Date("2026-11-10T12:00:00-03:00");

function session(startIso: string, endIso: string | null) {
	return {
		startsAt: new Date(startIso),
		endsAt: endIso ? new Date(endIso) : null,
	};
}

function activity(
	id: string,
	name: string,
	sessions: ReturnType<typeof session>[],
	workload?: number | null,
): ConflictActivityLike {
	return { id, name, sessions, workload: workload ?? null };
}

const target = activity("target", "Alvo", [
	session("2026-11-10T14:00:00-03:00", "2026-11-10T16:00:00-03:00"),
]);

describe("findScheduleConflicts", () => {
	it("detecta sobreposição parcial", () => {
		const conflicts = findScheduleConflicts(
			target,
			[
				activity("a", "Sobreposta", [
					session(
						"2026-11-10T15:00:00-03:00",
						"2026-11-10T17:00:00-03:00",
					),
				]),
			],
			NOW,
		);

		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]?.otherActivity).toEqual({
			id: "a",
			name: "Sobreposta",
		});
	});

	it("detecta contenção total", () => {
		const conflicts = findScheduleConflicts(
			target,
			[
				activity("a", "Dentro", [
					session(
						"2026-11-10T14:30:00-03:00",
						"2026-11-10T15:30:00-03:00",
					),
				]),
			],
			NOW,
		);

		expect(conflicts).toHaveLength(1);
	});

	it("não conflita back-to-back", () => {
		const conflicts = findScheduleConflicts(
			target,
			[
				activity("a", "Antes", [
					session(
						"2026-11-10T12:00:00-03:00",
						"2026-11-10T14:00:00-03:00",
					),
				]),
				activity("b", "Depois", [
					session(
						"2026-11-10T16:00:00-03:00",
						"2026-11-10T18:00:00-03:00",
					),
				]),
			],
			NOW,
		);

		expect(conflicts).toHaveLength(0);
	});

	it("lista só os pares sobrepostos em multi-sessão e ordena", () => {
		const multi = activity("target", "Alvo", [
			session("2026-11-10T14:00:00-03:00", "2026-11-10T16:00:00-03:00"),
			session("2026-11-11T14:00:00-03:00", "2026-11-11T16:00:00-03:00"),
		]);
		const conflicts = findScheduleConflicts(
			multi,
			[
				activity("a", "Primeiro dia", [
					session(
						"2026-11-10T15:00:00-03:00",
						"2026-11-10T15:30:00-03:00",
					),
				]),
				activity("b", "Longe", [
					session(
						"2026-11-12T15:00:00-03:00",
						"2026-11-12T16:00:00-03:00",
					),
				]),
			],
			NOW,
		);

		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]?.otherActivity.id).toBe("a");
		expect(conflicts[0]?.targetSession.startsAt).toEqual(
			new Date("2026-11-10T14:00:00-03:00"),
		);
	});

	it("ignora o próprio alvo", () => {
		const conflicts = findScheduleConflicts(
			target,
			[
				activity("target", "Alvo", [
					session(
						"2026-11-10T15:00:00-03:00",
						"2026-11-10T17:00:00-03:00",
					),
				]),
			],
			NOW,
		);

		expect(conflicts).toHaveLength(0);
	});

	it("ignora atividades inscritas já encerradas", () => {
		const conflicts = findScheduleConflicts(
			target,
			[
				activity("a", "Ontem", [
					session(
						"2026-11-09T15:00:00-03:00",
						"2026-11-09T17:00:00-03:00",
					),
				]),
			],
			NOW,
		);

		expect(conflicts).toHaveLength(0);
	});

	it("ignora sessões inscritas encerradas, mantendo as futuras", () => {
		const conflicts = findScheduleConflicts(
			target,
			[
				activity("a", "Mista", [
					session(
						"2026-11-09T15:00:00-03:00",
						"2026-11-09T17:00:00-03:00",
					),
					session(
						"2026-11-10T15:00:00-03:00",
						"2026-11-10T17:00:00-03:00",
					),
				]),
			],
			NOW,
		);

		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]?.otherSession.startsAt).toEqual(
			new Date("2026-11-10T15:00:00-03:00"),
		);
	});

	it("estima o fim pela carga horária quando não há endsAt", () => {
		const noEnd = activity(
			"target",
			"Alvo",
			[{ startsAt: new Date("2026-11-10T14:00:00-03:00"), endsAt: null }],
			2,
		);
		const conflicts = findScheduleConflicts(
			noEnd,
			[
				activity("a", "Sobreposta", [
					session(
						"2026-11-10T15:00:00-03:00",
						"2026-11-10T17:00:00-03:00",
					),
				]),
				activity("b", "Fora", [
					session(
						"2026-11-10T16:30:00-03:00",
						"2026-11-10T17:30:00-03:00",
					),
				]),
			],
			NOW,
		);

		expect(conflicts.map((c) => c.otherActivity.id)).toEqual(["a"]);
	});

	it("ponto sem carga só conflita estritamente dentro de outra sessão", () => {
		const point = activity("target", "Alvo", [
			{ startsAt: new Date("2026-11-10T15:00:00-03:00"), endsAt: null },
		]);
		const conflicts = findScheduleConflicts(
			point,
			[
				activity("a", "Contém", [
					session(
						"2026-11-10T14:00:00-03:00",
						"2026-11-10T16:00:00-03:00",
					),
				]),
				activity("b", "Borda", [
					session(
						"2026-11-10T15:00:00-03:00",
						"2026-11-10T17:00:00-03:00",
					),
				]),
			],
			NOW,
		);

		expect(conflicts.map((c) => c.otherActivity.id)).toEqual(["a"]);
	});

	it("retorna vazio sem sessões no alvo", () => {
		expect(
			findScheduleConflicts(activity("t", "Alvo", []), [target], NOW),
		).toHaveLength(0);
	});
});

describe("findScheduleConflicts com allowOverlap", () => {
	const overlapping = activity("a", "Sobreposta", [
		session("2026-11-10T15:00:00-03:00", "2026-11-10T17:00:00-03:00"),
	]);

	it("ignora o par quando o alvo permite", () => {
		const conflicts = findScheduleConflicts(
			{ ...target, allowOverlap: true },
			[overlapping],
			NOW,
		);

		expect(conflicts).toHaveLength(0);
	});

	it("ignora o par quando a inscrita permite", () => {
		const conflicts = findScheduleConflicts(
			target,
			[{ ...overlapping, allowOverlap: true }],
			NOW,
		);

		expect(conflicts).toHaveLength(0);
	});

	it("ignora quando ambos permitem", () => {
		const conflicts = findScheduleConflicts(
			{ ...target, allowOverlap: true },
			[{ ...overlapping, allowOverlap: true }],
			NOW,
		);

		expect(conflicts).toHaveLength(0);
	});

	it("bloqueia quando nenhum permite", () => {
		const conflicts = findScheduleConflicts(target, [overlapping], NOW);

		expect(conflicts).toHaveLength(1);
	});

	it("ignora só a inscrita sinalizada e mantém o conflito real", () => {
		const conflicts = findScheduleConflicts(
			target,
			[
				{ ...overlapping, allowOverlap: true },
				activity("b", "Bloqueadora", [
					session(
						"2026-11-10T15:30:00-03:00",
						"2026-11-10T16:30:00-03:00",
					),
				]),
			],
			NOW,
		);

		expect(conflicts.map((c) => c.otherActivity.id)).toEqual(["b"]);
	});
});
