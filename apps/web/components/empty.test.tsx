// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Empty } from "@/components/empty";

describe("Empty", () => {
	it("renders the default title and description", () => {
		render(<Empty />);

		expect(
			screen.getByText(/não encontramos nada/i),
		).toBeInTheDocument();
		expect(screen.getByText(/outras palavras/i)).toBeInTheDocument();
	});

	it("renders a custom title, description and children", () => {
		render(
			<Empty title="Sem resultados" description="Nada por aqui">
				<button>retry</button>
			</Empty>,
		);

		expect(screen.getByText("Sem resultados")).toBeInTheDocument();
		expect(screen.getByText("Nada por aqui")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "retry" })).toBeInTheDocument();
	});

	it("renders a clear-filters link when href is provided", () => {
		render(<Empty href="/eventos" />);

		const link = screen.getByRole("link", { name: /limpar filtros/i });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "/eventos");
	});
});
