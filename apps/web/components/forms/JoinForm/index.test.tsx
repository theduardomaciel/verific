// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import JoinForm from "@/components/forms/JoinForm/index";

afterEach(cleanup);
beforeEach(() => {
	vi.clearAllMocks();
	window.localStorage.clear();
});
vi.mock("@/public/icons/google.svg", () => ({
	default: () => null,
}));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/app/actions", () => ({
	refreshRoute: vi.fn(),
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

function renderForm(user?: { id: string; name: string; email: string }) {
	return render(
		<JoinForm
			project={project}
			formData={formData}
			profileLayout={null}
			user={user as never}
		/>,
	);
}

const mockUser = {
	id: "u1",
	name: "Fulano da Silva",
	email: "fulano@ic.ufal.br",
};

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
		renderForm(mockUser);

		fireEvent.click(sectionContinuars()[1]!);

		await screen.findByText("Obrigatório");
		expect(vi.mocked(scrollToNextSection)).not.toHaveBeenCalled();
		expect(document.getElementById("section2")).toHaveClass(
			"pointer-events-none",
		);
	});

	it("avança p/ a próxima seção após preencher os obrigatórios", async () => {
		renderForm(mockUser);

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

	it("bloqueia a saída da identificação sem login e pede autenticação", () => {
		renderForm();

		fireEvent.click(sectionContinuars()[0]!);

		expect(
			screen.getByText(/Entre com sua conta Google/i),
		).toBeInTheDocument();
		expect(vi.mocked(scrollToNextSection)).not.toHaveBeenCalled();
		expect(document.getElementById("section2")).toHaveClass(
			"pointer-events-none",
		);
	});

	it("restaura o rascunho após remontagem", () => {
		const draftProject = { id: "p-draft", url: "evento" };
		const { unmount } = render(
			<JoinForm
				project={draftProject}
				formData={formData}
				profileLayout={null}
				user={mockUser as never}
			/>,
		);

		const boxes = screen.getAllByRole("textbox");
		fireEvent.change(boxes[0]!, { target: { value: "Fulano da Silva" } });
		fireEvent.change(boxes[1]!, { target: { value: "fulana" } });

		unmount();
		render(
			<JoinForm
				project={draftProject}
				formData={formData}
				profileLayout={null}
				user={mockUser as never}
			/>,
		);

		const restored = screen.getAllByRole("textbox");
		expect((restored[0] as HTMLInputElement).value).toBe("Fulano da Silva");
		expect((restored[1] as HTMLInputElement).value).toBe("fulana");
	});

	it.each([mockUser, undefined])(
		"não troca o nome digitado ao remontar (usuário %#)",
		(user) => {
			const draftProject = {
				id: `p-name-${user ? "in" : "out"}`,
				url: "e",
			};
			const props = {
				project: draftProject,
				formData,
				profileLayout: null,
				user: user as never,
			};
			const { unmount } = render(<JoinForm {...props} />);
			fireEvent.change(screen.getAllByRole("textbox")[0]!, {
				target: { value: "Outro Nome" },
			});

			unmount();
			render(<JoinForm {...props} />);

			expect(
				(screen.getAllByRole("textbox")[0] as HTMLInputElement).value,
			).toBe("Outro Nome");
		},
	);

	it("preenche o nome da conta no login feito no meio do preenchimento", () => {
		const props = {
			project: { id: "p-login", url: "e" },
			formData,
			profileLayout: null,
		};
		const { rerender } = render(<JoinForm {...props} />);

		rerender(<JoinForm {...props} user={mockUser as never} />);

		expect(
			(screen.getAllByRole("textbox")[0] as HTMLInputElement).value,
		).toBe(mockUser.name);
	});
});
