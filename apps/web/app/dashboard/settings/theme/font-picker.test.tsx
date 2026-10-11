// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { presetFont, type ThemeFontSelection } from "@verific/drizzle/theme";

import { FontPicker } from "./font-picker";

afterEach(cleanup);

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
});
