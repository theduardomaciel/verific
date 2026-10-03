import { describe, expect, it } from "vitest";

import {
	formatAnswerValue,
	validateAnswers,
	type FormFieldForValidation,
} from "./schemas";

const textField: FormFieldForValidation = {
	key: "name",
	label: "Nome",
	type: "text",
	required: true,
	isVisible: true,
	isActive: true,
};

const optionalChoiceField: FormFieldForValidation = {
	key: "interests",
	label: "Interesses",
	type: "select_multiple",
	required: false,
	options: ["esporte", "musica"],
	isVisible: true,
	isActive: true,
};

describe("validateAnswers", () => {
	it("accepts valid answers", () => {
		const result = validateAnswers([textField], { name: "Ada" });

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ name: "Ada" });
	});

	it("reports missing required fields", () => {
		const result = validateAnswers([textField], { name: "" });

		expect(result.success).toBe(false);
		expect(result.errors?.name).toBeDefined();
	});

	it("ignores inactive or hidden fields", () => {
		const hidden = { ...textField, isVisible: false };
		const inactive = { ...textField, key: "other", isActive: false };

		const result = validateAnswers([hidden, inactive], {});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({});
	});

	it("normalizes empty optional answers to undefined", () => {
		const result = validateAnswers([optionalChoiceField], { interests: [] });

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ interests: undefined });
	});

	it("rejects invalid email answers", () => {
		const email = {
			key: "email",
			label: "E-mail",
			type: "email",
			required: true,
			isVisible: true,
			isActive: true,
		} satisfies FormFieldForValidation;

		expect(
			validateAnswers([email], { email: "not-an-email" }).success,
		).toBe(false);
		expect(validateAnswers([email], { email: "ada@example.com" }).success).toBe(
			true,
		);
	});

	it("rejects unknown options when allowOther is off", () => {
		const single = {
			key: "color",
			label: "Cor",
			type: "select_single",
			required: true,
			options: ["azul", "verde"],
			allowOther: false,
			isVisible: true,
			isActive: true,
		} satisfies FormFieldForValidation;

		expect(validateAnswers([single], { color: "azul" }).success).toBe(true);
		expect(validateAnswers([single], { color: "roxo" }).success).toBe(false);
	});

	it("accepts custom text as-is when allowOther is on", () => {
		const single = {
			key: "color",
			label: "Cor",
			type: "select_single",
			required: true,
			options: ["azul", "verde"],
			allowOther: true,
			isVisible: true,
			isActive: true,
		} satisfies FormFieldForValidation;

		const ok = validateAnswers([single], { color: "roxo" });
		expect(ok.success).toBe(true);
		expect(ok.data).toEqual({ color: "roxo" });

		// Empty/whitespace custom text is invalid on required fields…
		expect(validateAnswers([single], { color: "" }).success).toBe(false);
		expect(validateAnswers([single], { color: "   " }).success).toBe(false);

		// …and capped at 200 chars.
		expect(
			validateAnswers([single], { color: "x".repeat(201) }).success,
		).toBe(false);
		expect(
			validateAnswers([single], { color: "x".repeat(200) }).success,
		).toBe(true);
	});

	it("counts Outro as one selection in select_multiple", () => {
		const multi = {
			key: "diet",
			label: "Dieta",
			type: "select_multiple",
			required: true,
			options: ["vegana", "vegetariana"],
			allowOther: true,
			isVisible: true,
			isActive: true,
		} satisfies FormFieldForValidation;

		const ok = validateAnswers([multi], { diet: ["vegana", "frugívora"] });
		expect(ok.success).toBe(true);
		expect(ok.data).toEqual({ diet: ["vegana", "frugívora"] });
		expect(validateAnswers([multi], { diet: [] }).success).toBe(false);
	});
});

describe("formatAnswerValue", () => {
	it("formats lists, booleans and dates", () => {
		expect(formatAnswerValue("select_multiple", ["a", "b"])).toBe("a; b");
		expect(formatAnswerValue("checkbox", true)).toBe("Sim");
		expect(formatAnswerValue("checkbox", false)).toBe("Não");
		expect(formatAnswerValue("date", new Date("2026-04-12T00:00:00Z"))).toBe(
			"2026-04-12",
		);
	});

	it("returns an empty string for empty values", () => {
		expect(formatAnswerValue("text", null)).toBe("");
		expect(formatAnswerValue("text", undefined)).toBe("");
		expect(formatAnswerValue("text", "")).toBe("");
	});
});
