import { describe, expect, it } from "vitest";

import {
	getQuickJoinBlockReason,
	getQuickJoinEligibility,
	type QuickJoinActivity,
	type QuickJoinMembership,
} from "@/lib/quick-join";

import type { Conflict } from "@/lib/schedule/conflicts";

const baseActivity: QuickJoinActivity = {
	id: "act-1",
	workload: 2,
	isRegistrationOpen: true,
	participantsLimit: 30,
	participantsCount: 10,
	sessions: [
		{
			startsAt: new Date(Date.now() + 24 * 3600 * 1000),
			endsAt: new Date(Date.now() + 26 * 3600 * 1000),
		},
	],
	tolerance: null,
	hasForm: false,
};

const baseMembership: QuickJoinMembership = {
	userId: "user-1",
	participantId: "part-1",
	subscribedIds: ["other-activity"],
};

describe("getQuickJoinEligibility", () => {
	it("permite quick join quando tudo está certo", () => {
		expect(getQuickJoinEligibility(baseActivity, baseMembership)).toBe(
			true,
		);
	});

	it("permite sem limite de vagas", () => {
		expect(
			getQuickJoinEligibility(
				{ ...baseActivity, participantsLimit: null },
				baseMembership,
			),
		).toBe(true);
	});

	it("barra deslogado e fora do evento", () => {
		expect(
			getQuickJoinEligibility(baseActivity, {
				...baseMembership,
				userId: null,
			}),
		).toBe(false);
		expect(
			getQuickJoinEligibility(baseActivity, {
				...baseMembership,
				participantId: null,
			}),
		).toBe(false);
	});

	it("barra sem workload (botão nem apareceria no card)", () => {
		expect(
			getQuickJoinEligibility(
				{ ...baseActivity, workload: 0 },
				baseMembership,
			),
		).toBe(false);
		expect(
			getQuickJoinEligibility(
				{ ...baseActivity, workload: null },
				baseMembership,
			),
		).toBe(false);
	});

	it("barra inscrições fechadas", () => {
		expect(
			getQuickJoinEligibility(
				{ ...baseActivity, isRegistrationOpen: false },
				baseMembership,
			),
		).toBe(false);
	});

	it("barra lotada", () => {
		expect(
			getQuickJoinEligibility(
				{ ...baseActivity, participantsCount: 30 },
				baseMembership,
			),
		).toBe(false);
		expect(
			getQuickJoinEligibility(
				{ ...baseActivity, participantsCount: 31 },
				baseMembership,
			),
		).toBe(false);
	});

	it("barra atividade encerrada", () => {
		expect(
			getQuickJoinEligibility(
				{
					...baseActivity,
					sessions: [
						{
							startsAt: new Date(Date.now() - 4 * 3600 * 1000),
							endsAt: new Date(Date.now() - 2 * 3600 * 1000),
						},
					],
				},
				baseMembership,
			),
		).toBe(false);
	});

	it("barra já inscrito", () => {
		expect(
			getQuickJoinEligibility(baseActivity, {
				...baseMembership,
				subscribedIds: ["act-1"],
			}),
		).toBe(false);
	});

	it("barra com formulário — e nunca adivinha `undefined`", () => {
		expect(
			getQuickJoinEligibility(
				{ ...baseActivity, hasForm: true },
				baseMembership,
			),
		).toBe(false);
		expect(
			getQuickJoinEligibility(
				{
					id: baseActivity.id,
					workload: baseActivity.workload,
					isRegistrationOpen: baseActivity.isRegistrationOpen,
					participantsLimit: baseActivity.participantsLimit,
					participantsCount: baseActivity.participantsCount,
					sessions: baseActivity.sessions,
					tolerance: baseActivity.tolerance,
				},
				baseMembership,
			),
		).toBe(false);
	});

	it("barra com fila de espera", () => {
		expect(
			getQuickJoinEligibility(
				{ ...baseActivity, tolerance: 10 },
				baseMembership,
			),
		).toBe(false);
	});

	it("ignora tolerância obsoleta com a fila desligada", () => {
		expect(
			getQuickJoinEligibility(
				{
					...baseActivity,
					tolerance: 10,
					waitlistEnabled: false,
				},
				baseMembership,
			),
		).toBe(true);
	});

	it("barra com conflito de horário, com motivo distinguível", () => {
		const conflicts: Conflict[] = [
			{
				otherActivity: { id: "act-2", name: "Mesa" },
				otherSession: {
					startsAt: new Date(Date.now() + 25 * 3600 * 1000),
					endsAt: new Date(Date.now() + 27 * 3600 * 1000),
				},
				targetSession: {
					startsAt: new Date(Date.now() + 24 * 3600 * 1000),
					endsAt: new Date(Date.now() + 26 * 3600 * 1000),
				},
			},
		];
		const membership: QuickJoinMembership = {
			...baseMembership,
			conflicts,
		};

		expect(getQuickJoinEligibility(baseActivity, membership)).toBe(false);
		expect(getQuickJoinBlockReason(baseActivity, membership)).toBe(
			"conflict",
		);
	});

	it("sem conflito, não há motivo de bloqueio", () => {
		expect(getQuickJoinEligibility(baseActivity, baseMembership)).toBe(
			true,
		);
		expect(
			getQuickJoinBlockReason(baseActivity, baseMembership),
		).toBeNull();
		expect(
			getQuickJoinBlockReason(baseActivity, {
				...baseMembership,
				userId: null,
			}),
		).toBeNull();
	});
});
