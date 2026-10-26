// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { EditMyAnswersForm } from "./EditAnswersForm";

afterEach(cleanup);

// Componentes do Radix medem o tamanho com ResizeObserver
beforeAll(() => {
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		},
	);
});

const { mutate, setVisibility } = vi.hoisted(() => ({
	mutate: vi.fn(),
	setVisibility: vi.fn(),
}));

const field = (over: Record<string, unknown>) => ({
	sectionId: "s1",
	required: false,
	options: null,
	allowOther: false,
	validation: null,
	isVisible: true,
	isActive: true,
	editableAfterSignup: true,
	helpText: null,
	halfWidth: false,
	order: 0,
	...over,
});

const published = {
	fields: [
		field({
			id: "f-tel",
			key: "telefone",
			label: "Telefone",
			type: "text",
			required: true,
		}),
		field({
			id: "f-est",
			key: "estudante",
			label: "Sou estudante",
			type: "checkbox",
			order: 1,
		}),
		field({
			id: "f-curso",
			key: "curso",
			label: "Curso",
			type: "text",
			sectionId: "s2",
		}),
	],
	sections: [
		{ id: "s1", title: "Dados", order: 0, visibilityRule: null },
		{
			id: "s2",
			title: "Estudo",
			order: 1,
			visibilityRule: { sourceFieldId: "f-est", operator: "is_checked" },
		},
	],
};

const answers = [
	{ value: "+5582999990000", field: { key: "telefone" } },
	{ value: true, field: { key: "estudante" } },
	{ value: "Engenharia", field: { key: "curso" } },
];

vi.mock("@/lib/trpc/react", () => ({
	trpc: {
		useUtils: () => ({
			getMyProfileData: { invalidate: vi.fn() },
			getMyAnswers: { invalidate: vi.fn() },
		}),
		getPublishedForm: {
			useQuery: () => ({ data: published, isPending: false }),
		},
		getMyAnswers: {
			useQuery: () => ({
				data: { participant: { id: "p1" }, answers },
				isPending: false,
			}),
		},
		getMyProfileData: {
			useQuery: () => ({
				data: {
					visibility: { telefone: false },
					linkedKeys: ["telefone"],
				},
			}),
		},
		setFieldVisibility: { useMutation: () => ({ mutate: setVisibility }) },
		updateMyAnswers: {
			useMutation: () => ({ mutate, isPending: false }),
		},
	},
}));

describe("EditMyAnswersForm", () => {
	it("mostra a visibilidade da pergunta ligada ao perfil pela chave", () => {
		render(<EditMyAnswersForm projectId="e1" projectUrl="evento" />);

		const toggle = screen.getByRole("switch", {
			name: "Visível no perfil",
		});
		expect(toggle.getAttribute("aria-checked")).toBe("false");
		fireEvent.click(toggle);
		expect(setVisibility).toHaveBeenCalledWith({
			projectUrl: "evento",
			fieldId: "f-tel",
			visible: true,
		});
	});

	it("pede confirmação antes de apagar as respostas de uma seção escondida", async () => {
		render(<EditMyAnswersForm projectId="e1" projectUrl="evento" />);

		fireEvent.click(
			screen.getByRole("checkbox", { name: "Sou estudante" }),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Salvar respostas" }),
		);

		await screen.findByText(/as respostas delas serão apagadas: Curso/);
		expect(mutate).not.toHaveBeenCalled();

		fireEvent.click(
			screen.getByRole("button", { name: "Salvar e apagar" }),
		);
		await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
		expect(mutate.mock.calls[0]![0].answers).not.toHaveProperty("curso");
	});

	it("mantém a seção que depende de um campo não editável", async () => {
		published.fields[1]!.editableAfterSignup = false;
		try {
			render(<EditMyAnswersForm projectId="e1" projectUrl="evento" />);

			fireEvent.click(
				screen.getByRole("button", { name: "Salvar respostas" }),
			);

			await waitFor(() => expect(mutate).toHaveBeenCalled());
			expect(mutate.mock.lastCall![0].answers).toHaveProperty(
				"curso",
				"Engenharia",
			);
		} finally {
			published.fields[1]!.editableAfterSignup = true;
		}
	});
});
