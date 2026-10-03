// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
	ConfirmDialog,
	useConfirmDialog,
} from "@/components/ui/confirm-dialog";

describe("ConfirmDialog", () => {
	it("renders title, description and actions when open", async () => {
		const onOpenChange = vi.fn();
		const onConfirm = vi.fn();

		render(
			<ConfirmDialog
				open
				onOpenChange={onOpenChange}
				title="Criar nova versão?"
				description="Uma nova versão vazia será criada."
				confirmLabel="Criar versão"
				onConfirm={onConfirm}
			/>,
		);

		expect(screen.getByText("Criar nova versão?")).toBeInTheDocument();
		expect(
			screen.getByText("Uma nova versão vazia será criada."),
		).toBeInTheDocument();

		await userEvent.click(
			screen.getByRole("button", { name: "Criar versão" }),
		);
		expect(onConfirm).toHaveBeenCalledOnce();

		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("disables actions and shows the pending label while pending", () => {
		render(
			<ConfirmDialog
				open
				onOpenChange={() => {}}
				title="Aguarde"
				confirmLabel="Criar versão"
				pendingLabel="Criando..."
				isPending
				onConfirm={() => {}}
			/>,
		);

		expect(screen.getByRole("button", { name: "Criando..." })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
	});
});

describe("useConfirmDialog", () => {
	function Harness({ onResult }: { onResult: (v: boolean) => void }) {
		const { confirm, dialogProps } = useConfirmDialog();
		return (
			<>
				<button
					onClick={() =>
						void confirm({ title: "Duplicar v1?" }).then(onResult)
					}
				>
					ask
				</button>
				<ConfirmDialog {...dialogProps} />
			</>
		);
	}

	it("resolves true on confirm and false on cancel/close", async () => {
		const onResult = vi.fn();
		render(<Harness onResult={onResult} />);

		// NOTE: fireEvent instead of userEvent here — Radix leaves
		// `pointer-events: none` on <body> in jsdom after a modal closes,
		// which makes userEvent's pointer check fail on the next click.
		fireEvent.click(screen.getByRole("button", { name: "ask" }));
		expect(screen.getByText("Duplicar v1?")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
		await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));

		fireEvent.click(screen.getByRole("button", { name: "ask" }));
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
	});
});
