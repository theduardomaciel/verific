// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import JoinForm from "@/components/forms/JoinForm/index";

afterEach(cleanup);
vi.mock("@/public/icons/google.svg", () => ({
	default: () => null,
}));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/app/actions", () => ({
	revalidateParticipantEnrollment: vi.fn(),
	loginAction: vi.fn(),
	signOutAction: vi.fn(),
}));
vi.mock("@/lib/validations", async (importOriginal) => {
	const actual = await importOriginal<typeof ValidationsModule>();
	return { ...actual, scrollToNextSection: vi.fn() };
});

import { scrollToNextSection } from "@/lib/validations";
import type * as ValidationsModule from "@/lib/validations";

const mockMutateAsync = vi.fn();

vi.mock("@/lib/trpc/react", () => ({
	trpc: {
		getPublishedForm: {
			useQuery: () => ({
				data: {
					fields: [
						{
							id: "f1",
							key: "apelido",
							label: "Apelido",
							type: "text",
							required: true,
							options: null,
							allowOther: false,
							validation: null,
							isVisible: true,
							isActive: true,
							sectionId: "s1",
							order: 0,
							halfWidth: false,
						},
						{
							id: "f2",
							key: "termo",
							label: "Termo",
							type: "text",
							required: true,
							options: null,
							allowOther: false,
							validation: null,
							isVisible: true,
							isActive: true,
							sectionId: "s2",
							order: 1,
							halfWidth: false,
						},
					],
					sections: [
						{
							id: "s1",
							title: "Dados",
							order: 0,
							visibilityRule: null,
						},
						{
							id: "s2",
							title: "Termos",
							order: 1,
							visibilityRule: null,
						},
					],
				},
				isPending: false,
			}),
		},
		getProfileLayout: {
			useQuery: () => ({ data: null, isPending: false }),
		},
		submitAnswers: {
			useMutation: () => ({
				mutateAsync: mockMutateAsync,
				isPending: false,
			}),
		},
	},
}));

const project = { id: "p1", url: "evento" };

const formData = {
	version: null,
	fields: [
		{
			id: "f1",
			key: "apelido",
			label: "Apelido",
			type: "text",
			required: true,
			options: null,
			allowOther: false,
			validation: null,
			isVisible: true,
			isActive: true,
			sectionId: "s1",
			order: 0,
			halfWidth: false,
		},
		{
			id: "f2",
			key: "termo",
			label: "Termo",
			type: "text",
			required: true,
			options: null,
			allowOther: false,
			validation: null,
			isVisible: true,
			isActive: true,
			sectionId: "s2",
			order: 1,
			halfWidth: false,
		},
	],
	sections: [
		{ id: "s1", title: "Dados", order: 0, visibilityRule: null },
		{ id: "s2", title: "Termos", order: 1, visibilityRule: null },
	],
} as never;

function renderForm() {
	return render(
		<JoinForm project={project} formData={formData} profileLayout={null} />,
	);
}

function sectionContinuars() {
	// Nome acessível exato exclui o "Continuar com Google" da Seção 0.
	return screen.getAllByRole("button", { name: "Continuar" });
}

describe("JoinForm wizard", () => {
	it("trava a seção 2 até a 1 estar válida", () => {
		renderForm();

		expect(document.getElementById("section2")).toHaveClass(
			"pointer-events-none",
		);
	});

	it("bloqueia o avanço com obrigatório vazio e mostra o erro", async () => {
		renderForm();

		fireEvent.click(sectionContinuars()[1]!);

		await screen.findByText("Obrigatório");
		expect(vi.mocked(scrollToNextSection)).not.toHaveBeenCalled();
		expect(document.getElementById("section2")).toHaveClass(
			"pointer-events-none",
		);
	});

	it("avança p/ a próxima seção após preencher os obrigatórios", async () => {
		renderForm();

		const boxes = screen.getAllByRole("textbox");
		fireEvent.change(boxes[0]!, { target: { value: "Fulano da Silva" } });
		fireEvent.change(boxes[1]!, { target: { value: "fulana" } });

		fireEvent.click(sectionContinuars()[1]!);

		await waitFor(() => {
			expect(vi.mocked(scrollToNextSection)).toHaveBeenCalledWith(2);
		});
		expect(document.getElementById("section2")).not.toHaveClass(
			"pointer-events-none",
		);
	});
});
