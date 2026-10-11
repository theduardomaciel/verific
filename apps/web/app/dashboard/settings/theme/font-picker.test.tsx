// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { presetFont, type ThemeFontSelection } from "@verific/drizzle/theme";

import { FontPicker } from "./font-picker";

afterEach(cleanup);

function stubMatchMedia(matches: boolean) {
	Object.defineProperty(window, "matchMedia", {
		value: vi.fn(() => ({
			matches,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
		writable: true,
		configurable: true,
	});
}

beforeAll(() => {
	stubMatchMedia(true);
});

function renderPicker(onChange: (selection: ThemeFontSelection) => void) {
	return render(
		<FontPicker
			label="Títulos"
			fontRole="heading"
			value={presetFont("rem")}
			onChange={onChange}
			virtualize={false}
		/>,
	);
}

describe("FontPicker", () => {
	it("abre, carrega o catálogo e seleciona por busca", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderPicker(onChange);

		await user.click(screen.getByRole("button", { name: /Títulos: REM/i }));
		await waitFor(() => {
			expect(
				screen.getByPlaceholderText("Pesquisar fonte..."),
			).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(
				screen.getByRole("option", { name: /Inter/ }),
			).toBeInTheDocument();
		});

		await user.type(
			screen.getByPlaceholderText("Pesquisar fonte..."),
			"playfair",
		);
		await waitFor(() => {
			expect(
				screen.getByRole("option", { name: /Playfair Display/ }),
			).toBeInTheDocument();
		});
		expect(
			screen.queryByRole("option", { name: /^Inter/ }),
		).not.toBeInTheDocument();

		await user.click(
			screen.getByRole("option", { name: /Playfair Display/ }),
		);
		expect(onChange).toHaveBeenCalledWith(
			expect.objectContaining({ family: "Playfair Display" }),
		);
	});

	it("alterna pesos e restaura o padrão", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderPicker(onChange);

		await user.click(screen.getByRole("button", { name: /Títulos: REM/i }));
		await waitFor(() => {
			expect(
				screen.getByRole("option", { name: /REM/ }),
			).toBeInTheDocument();
		});

		const weight700 = screen.getByRole("button", { name: "Peso 700" });
		expect(weight700).toHaveAttribute("aria-pressed", "true");
		await user.click(weight700);
		expect(onChange).toHaveBeenCalledWith(
			expect.objectContaining({
				family: "REM",
				weights: [400, 500, 600],
			}),
		);

		await user.click(screen.getByRole("button", { name: "Padrão" }));
		expect(onChange).toHaveBeenCalledWith(
			expect.objectContaining({ family: "REM" }),
		);
	});

	it("emite a dica de hover e limpa ao fechar", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const onHoverPreview = vi.fn();
		render(
			<FontPicker
				label="Títulos"
				fontRole="heading"
				value={presetFont("rem")}
				onChange={onChange}
				onHoverPreview={onHoverPreview}
				virtualize={false}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /Títulos: REM/i }));
		const option = await screen.findByRole("option", {
			name: /Playfair Display/,
		});
		await user.hover(option);
		expect(onHoverPreview).toHaveBeenCalledWith(
			expect.objectContaining({ family: "Playfair Display" }),
		);

		await user.click(screen.getByRole("button", { name: "Concluir" }));
		expect(onHoverPreview).toHaveBeenLastCalledWith(null);
	});

	it("abre em gaveta no mobile", async () => {
		stubMatchMedia(false);
		try {
			const user = userEvent.setup();
			renderPicker(vi.fn());

			await user.click(
				screen.getByRole("button", { name: /Títulos: REM/i }),
			);
			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Pesquisar fonte..."),
				).toBeInTheDocument();
			});
			expect(
				screen.getByText("Títulos: seletor de fontes"),
			).toBeInTheDocument();
		} finally {
			stubMatchMedia(true);
		}
	});
});
