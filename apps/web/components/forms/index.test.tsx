// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FormSection } from "@/components/forms";

vi.mock("@/lib/validations", () => ({
	scrollToNextSection: vi.fn(),
}));

afterEach(cleanup);

function renderSection(formType?: string, section = 0) {
	const setValue = vi.fn();
	const form = { watch: () => formType, setValue } as never;
	render(
		<FormSection title="Dados" section={section} form={form} fields={[]}>
			<input placeholder="Nome" />
		</FormSection>,
	);
	return { setValue };
}

describe("FormSection", () => {
	it("does not swallow spaces typed in text fields", async () => {
		const user = userEvent.setup();
		// Sem `formType`: formulário sem wizard, todas as seções exibidas.
		renderSection(undefined);
		const input = screen.getByPlaceholderText("Nome");
		await user.click(input);
		await user.keyboard("Maria Silva");
		expect(input).toHaveValue("Maria Silva");
	});

	it("does not preventDefault space keydown coming from inputs", () => {
		renderSection(undefined);
		const input = screen.getByPlaceholderText("Nome");
		// `fireEvent` retorna false quando algum handler chamou preventDefault.
		expect(fireEvent.keyDown(input, { key: " " })).toBe(true);
	});

	it("still selects the section on space when the section itself is focused", () => {
		// Wizard em `section1`: a seção 0 está liberada mas não selecionada.
		const { setValue } = renderSection("section1", 0);
		const section = screen.getByRole("button");
		fireEvent.keyDown(section, { key: " " });
		expect(setValue).toHaveBeenCalledWith("formType", "section0");
	});
});
