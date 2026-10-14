import { describe, expect, it } from "vitest";

import { matchBadgeAnswers, type BadgeAnswerRow } from "./badge-answers";

const boundById = new Map([
	["field-v2", { key: "instituicao", type: "text" }],
	["field-course", { key: "curso", type: "select_single" }],
]);

function row(overrides: Partial<BadgeAnswerRow>): BadgeAnswerRow {
	return {
		participantId: "p1",
		fieldId: "field-v2",
		valueText: null,
		valueNumber: null,
		valueDate: null,
		valueJson: null,
		fieldSnapshot: null,
		updatedAt: new Date("2026-01-01"),
		...overrides,
	};
}

describe("matchBadgeAnswers", () => {
	it("casa por fieldId mesmo com chave renomeada", () => {
		const out = matchBadgeAnswers({
			boundById,
			answers: [
				row({
					fieldId: "field-v2",
					fieldSnapshot: { key: "instituicao_antiga" },
					valueText: "UFAL",
				}),
			],
		});
		expect(out.get("p1")).toEqual({ instituicao: "UFAL" });
	});

	it("casa por chave para respostas de outra versão", () => {
		const out = matchBadgeAnswers({
			boundById,
			answers: [
				row({
					fieldId: "field-v1",
					fieldSnapshot: { key: "curso" },
					valueText: "Medicina",
				}),
			],
		});
		expect(out.get("p1")).toEqual({ curso: "Medicina" });
	});

	it("a resposta mais recente ganha", () => {
		const out = matchBadgeAnswers({
			boundById,
			answers: [
				row({ valueText: "Antiga", updatedAt: new Date("2026-01-01") }),
				row({ valueText: "Nova", updatedAt: new Date("2026-02-01") }),
			],
		});
		expect(out.get("p1")).toEqual({ instituicao: "Nova" });
	});

	it("descarta vazias e campos desconhecidos", () => {
		const out = matchBadgeAnswers({
			boundById,
			answers: [
				row({ valueText: "   " }),
				row({
					participantId: "p2",
					fieldId: "other",
					fieldSnapshot: { key: "outro" },
					valueText: "X",
				}),
			],
		});
		expect(out.has("p1")).toBe(false);
		expect(out.has("p2")).toBe(false);
	});
});
