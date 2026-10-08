import { zodResolver } from "@hookform/resolvers/zod";
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { z } from "@verific/zod";

import {
	DynamicField,
	type DynamicFormField,
} from "@/components/forms/dynamic/DynamicField";

import { focusFieldControl, getFieldId } from "@/lib/forms/field-id";

afterEach(cleanup);

beforeAll(() => {
	Object.defineProperty(window, "matchMedia", {
		value: vi.fn(() => ({ matches: false })),
		writable: true,
		configurable: true,
	});
	Object.defineProperty(Element.prototype, "scrollIntoView", {
		value: vi.fn(),
		writable: true,
		configurable: true,
	});
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		},
	);
});

function makeField(
	overrides: Partial<DynamicFormField> & {
		key: string;
		label: string;
		type: DynamicFormField["type"];
	},
): DynamicFormField {
	return {
		id: `id-${overrides.key}`,
		formVersionId: "v1",
		projectId: "p1",
		helpText: null,
		required: false,
		order: 0,
		sectionId: "s1",
		halfWidth: false,
		options: null,
		allowOther: false,
		validation: null,
		isVisible: true,
		editableAfterSignup: true,
		isActive: true,
		createdAt: new Date("2026-01-01T00:00:00Z"),
		...overrides,
	};
}

function Harness({ field }: { field: DynamicFormField }) {
	const form = useForm<{ answers: Record<string, unknown> }>({
		defaultValues: { answers: {} },
	});
	return (
		<FormProvider {...form}>
			<form noValidate>
				<DynamicField
					field={field}
					control={form.control}
					name={`answers.${field.key}`}
				/>
			</form>
		</FormProvider>
	);
}

function labelFor(id: string): HTMLLabelElement {
	const label = document.querySelector<HTMLLabelElement>(
		`label[for="${id}"]`,
	);
	expect(label).not.toBeNull();
	return label!;
}

describe("getFieldId", () => {
	it("normaliza o `name` do RHF para um id estável", () => {
		expect(getFieldId("answers.nome")).toBe("answers-nome");
		expect(getFieldId("answers.data de nascimento!")).toBe(
			"answers-data-de-nascimento",
		);
		expect(getFieldId("apelido")).toBe("apelido");
		expect(getFieldId("")).toBe("campo");
	});
});

describe("DynamicField acessibilidade", () => {
	it("associa label, id, obrigatório e ajuda no texto", () => {
		render(
			<Harness
				field={makeField({
					key: "nome",
					label: "Nome completo",
					type: "text",
					required: true,
					helpText: "Como está no crachá",
				})}
			/>,
		);

		const input = screen.getByLabelText(/nome completo/i);
		expect(input).toHaveAttribute("id", "answers-nome");
		expect(input).toHaveAttribute("aria-required", "true");
		expect(input).toHaveAttribute(
			"aria-describedby",
			"answers-nome-description",
		);

		const label = labelFor("answers-nome");
		const mark = label.querySelector("span");
		expect(mark).not.toBeNull();
		expect(mark).toHaveAttribute("aria-hidden", "true");

		const help = screen.getByText("Como está no crachá");
		expect(help).toHaveAttribute("id", "answers-nome-description");

		// Associação de plataforma (`label.control`): é o que faz o
		// navegador focar o controle ao clicar no rótulo (o jsdom não
		// simula esse comportamento de clique, então afirma-se a
		// associação em vez do foco via clique).
		expect(label.control).toBe(input);
	});

	it("expõe erro com `aria-invalid` + `aria-describedby` após submit inválido", async () => {
		function InvalidHarness({ field }: { field: DynamicFormField }) {
			const form = useForm({
				resolver: zodResolver(
					z.object({
						answers: z.object({
							nome: z.string().min(1, "Obrigatório"),
						}),
					}),
				),
				defaultValues: { answers: { nome: "" } },
			});
			return (
				<FormProvider {...form}>
					<form
						noValidate
						onSubmit={(e) => {
							void form.handleSubmit(() => {})(e);
						}}
					>
						<DynamicField
							field={field}
							control={form.control}
							name="answers.nome"
						/>
						<button type="submit">Enviar</button>
					</form>
				</FormProvider>
			);
		}

		render(
			<InvalidHarness
				field={makeField({
					key: "nome",
					label: "Nome completo",
					type: "text",
					required: true,
					helpText: "Como está no crachá",
				})}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

		const message = await screen.findByText("Obrigatório");
		expect(message).toHaveAttribute("id", "answers-nome-message");

		const input = screen.getByLabelText(/nome completo/i);
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input).toHaveAttribute(
			"aria-describedby",
			"answers-nome-description answers-nome-message",
		);
	});

	it("foca o controle direto pelo id do campo", () => {
		render(
			<Harness
				field={makeField({
					key: "nome",
					label: "Nome completo",
					type: "text",
				})}
			/>,
		);

		focusFieldControl(getFieldId("answers.nome"));
		expect(screen.getByLabelText(/nome completo/i)).toHaveFocus();
	});

	it("nomeia o grupo de rádio e foca o primeiro item", () => {
		render(
			<Harness
				field={makeField({
					key: "formato",
					label: "Formato",
					type: "radio_group",
					required: true,
					options: ["Presencial", "Online"],
				})}
			/>,
		);

		const group = screen.getByRole("radiogroup", { name: "Formato" });
		expect(group).toHaveAttribute("id", "answers-formato");
		expect(group).toHaveAttribute("aria-required", "true");

		focusFieldControl("answers-formato");
		expect(screen.getByRole("radio", { name: "Presencial" })).toHaveFocus();
	});

	it("nomeia a múltipla escolha e associa cada item", () => {
		render(
			<Harness
				field={makeField({
					key: "interesses",
					label: "Interesses",
					type: "select_multiple",
					options: ["Música", "Esporte"],
				})}
			/>,
		);

		expect(
			screen.getByRole("checkbox", { name: "Música" }),
		).toHaveAttribute("id", "answers-interesses-option-0");
		expect(
			screen.getByRole("checkbox", { name: "Esporte" }),
		).toHaveAttribute("id", "answers-interesses-option-1");

		const group = document.getElementById("answers-interesses");
		expect(group).toHaveAttribute("role", "group");
		expect(group).toHaveAttribute(
			"aria-labelledby",
			"answers-interesses-legend",
		);

		focusFieldControl("answers-interesses");
		expect(screen.getByRole("checkbox", { name: "Música" })).toHaveFocus();
	});

	it("associa o gatilho do select simples", () => {
		render(
			<Harness
				field={makeField({
					key: "turno",
					label: "Turno",
					type: "select_single",
					required: true,
					options: ["Manhã", "Tarde"],
				})}
			/>,
		);

		const trigger = screen.getByRole("combobox", { name: "Turno" });
		expect(trigger).toHaveAttribute("id", "answers-turno");
		expect(trigger).toHaveAttribute("aria-required", "true");
	});

	it("associa o checkbox único", () => {
		render(
			<Harness
				field={makeField({
					key: "aceito",
					label: "Aceito os termos",
					type: "checkbox",
					required: true,
				})}
			/>,
		);

		const box = screen.getByRole("checkbox", { name: "Aceito os termos" });
		expect(box).toHaveAttribute("id", "answers-aceito");
		expect(box).toHaveAttribute("aria-required", "true");
	});

	const singleCases: Array<{
		type: DynamicFormField["type"];
		key: string;
		label: string;
	}> = [
		{ type: "textarea", key: "bio", label: "Biografia" },
		{ type: "number", key: "idade", label: "Idade" },
		{ type: "date", key: "nascimento", label: "Nascimento" },
		{ type: "email", key: "email", label: "E-mail" },
		{ type: "phone", key: "telefone", label: "Telefone" },
	];

	it.each(singleCases)(
		"associa label estável para $type",
		({ type, key, label }) => {
			render(<Harness field={makeField({ key, label, type })} />);

			const control = screen.getByLabelText(new RegExp(label, "i"));
			expect(control).toHaveAttribute("id", getFieldId(`answers.${key}`));
			expect(control).not.toHaveAttribute("aria-required");

			expect(labelFor(getFieldId(`answers.${key}`)).control).toBe(
				control,
			);
		},
	);
});
