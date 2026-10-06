import { describe, expect, it } from "vitest";

import {
	evaluateSectionVisibility,
	filterVisibleFields,
	formatAnswerValue,
	getVisibleSectionIds,
	validateAnswers,
	validateSectionVisibilityRule,
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

describe("radio_group", () => {
	it("validates like select_single", () => {
		const radio = {
			key: "modality",
			label: "Modalidade",
			type: "radio_group",
			required: true,
			options: ["presencial", "online"],
			allowOther: false,
			isVisible: true,
			isActive: true,
		} satisfies FormFieldForValidation;

		expect(validateAnswers([radio], { modality: "online" }).success).toBe(true);
		expect(validateAnswers([radio], { modality: "hibrido" }).success).toBe(false);
	});

	it("accepts custom text when allowOther is on", () => {
		const radio = {
			key: "modality",
			label: "Modalidade",
			type: "radio_group",
			required: false,
			options: ["presencial", "online"],
			allowOther: true,
			isVisible: true,
			isActive: true,
		} satisfies FormFieldForValidation;

		expect(validateAnswers([radio], { modality: "hibrido" }).success).toBe(true);
	});
});

describe("evaluateSectionVisibility", () => {
	it("treats missing rule as visible", () => {
		expect(evaluateSectionVisibility(null, undefined)).toBe(true);
		expect(evaluateSectionVisibility(undefined, "x")).toBe(true);
	});

	it("evaluates checkbox operators", () => {
		expect(evaluateSectionVisibility({ sourceFieldId: "f", operator: "is_checked" }, true)).toBe(true);
		expect(evaluateSectionVisibility({ sourceFieldId: "f", operator: "is_checked" }, false)).toBe(false);
		expect(evaluateSectionVisibility({ sourceFieldId: "f", operator: "is_not_checked" }, false)).toBe(true);
	});

	it("evaluates equals and includes operators", () => {
		expect(
			evaluateSectionVisibility({ sourceFieldId: "f", operator: "equals", values: ["a", "b"] }, "b"),
		).toBe(true);
		expect(
			evaluateSectionVisibility({ sourceFieldId: "f", operator: "equals", values: ["a"] }, "c"),
		).toBe(false);
		expect(
			evaluateSectionVisibility({ sourceFieldId: "f", operator: "includes_any", values: ["a"] }, ["a", "b"]),
		).toBe(true);
		expect(
			evaluateSectionVisibility({ sourceFieldId: "f", operator: "includes_all", values: ["a", "b"] }, ["a"]),
		).toBe(false);
		expect(
			evaluateSectionVisibility({ sourceFieldId: "f", operator: "includes_all", values: ["a", "b"] }, ["a", "b", "c"]),
		).toBe(true);
	});
});

describe("conditional validation", () => {
	const trigger = {
		id: "f1",
		key: "hosting",
		label: "Hospedagem",
		type: "select_single",
		required: true,
		options: ["sim", "nao"],
		isVisible: true,
		isActive: true,
		sectionId: "s1",
	} satisfies FormFieldForValidation;
	const conditionalField = {
		id: "f2",
		key: "restriction",
		label: "Restrição",
		type: "text",
		required: true,
		isVisible: true,
		isActive: true,
		sectionId: "s2",
	} satisfies FormFieldForValidation;
	const sections = [
		{ id: "s1", visibilityRule: null },
		{ id: "s2", visibilityRule: { sourceFieldId: "f1", operator: "equals" as const, values: ["sim"] } },
	];

	it("ignores required fields in hidden sections", () => {
		const result = validateAnswers([trigger, conditionalField], { hosting: "nao" }, sections);
		expect(result.success).toBe(true);
	});

	it("requires fields in visible sections", () => {
		const result = validateAnswers([trigger, conditionalField], { hosting: "sim" }, sections);
		expect(result.success).toBe(false);
		expect(result.errors?.restriction).toBeDefined();
	});

	it("strips spoofed hidden answers", () => {
		const result = validateAnswers(
			[trigger, conditionalField],
			{ hosting: "nao", restriction: "x" },
			sections,
		);
		expect(result.success).toBe(true);
		expect(result.data).toEqual({ hosting: "nao" });
	});

	it("resolves visibility by field id", () => {
		const ids = getVisibleSectionIds(sections, [trigger, conditionalField], { hosting: "sim" });
		expect(ids.has("s2")).toBe(true);
		const hidden = getVisibleSectionIds(sections, [trigger, conditionalField], { hosting: "nao" });
		expect(hidden.has("s2")).toBe(false);
	});

	it("filters fields by visibility", () => {
		const visible = filterVisibleFields([trigger, conditionalField], sections, { hosting: "nao" });
		expect(visible.map((f) => f.key)).toEqual(["hosting"]);
	});
});

describe("validateSectionVisibilityRule", () => {
	it("rejects self-reference", () => {
		const err = validateSectionVisibilityRule({
			rule: { sourceFieldId: "f1", operator: "equals", values: ["a"] },
			sourceField: { id: "f1", type: "select_single", options: ["a"] },
			sectionId: "s2",
			sourceSectionId: "s2",
		});
		expect(err).toMatch(/mesma/);
	});

	it("rejects wrong operator for type", () => {
		const err = validateSectionVisibilityRule({
			rule: { sourceFieldId: "f1", operator: "equals", values: ["a"] },
			sourceField: { id: "f1", type: "checkbox", options: null },
			sectionId: "s2",
			sourceSectionId: "s1",
		});
		expect(err).toBeDefined();
	});

	it("accepts valid rules", () => {
		const err = validateSectionVisibilityRule({
			rule: { sourceFieldId: "f1", operator: "is_checked" },
			sourceField: { id: "f1", type: "checkbox", options: null },
			sectionId: "s2",
			sourceSectionId: "s1",
		});
		expect(err).toBeNull();
	});
});
