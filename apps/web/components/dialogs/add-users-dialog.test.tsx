// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { TRPCClientError } from "@trpc/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AddUsersDialog } from "@/components/dialogs/add-users-dialog";

import { renderInEventTimeZone } from "@/test/render";

afterEach(cleanup);

const participant = { id: "p1", userId: "u1", user: { name: "Ana" } };

const { mutateAsyncMock, toastErrorMock, refetchMock, refreshMock, state } =
	vi.hoisted(() => ({
		mutateAsyncMock: vi.fn(),
		toastErrorMock: vi.fn(),
		refreshMock: vi.fn(async () => {}),
		refetchMock: vi.fn(),
		state: { isError: false, selected: true },
	}));

afterEach(() => {
	vi.clearAllMocks();
	state.isError = false;
	state.selected = true;
});

vi.mock("sonner", () => ({
	toast: { error: toastErrorMock, success: vi.fn(), warning: vi.fn() },
}));
vi.mock("@/lib/trpc/react", () => ({
	trpc: {
		useUtils: () => ({}),
		addMonitorsToActivity: {
			useMutation: () => ({ mutateAsync: mutateAsyncMock }),
		},
		addActivityParticipants: {
			useMutation: () => ({ mutateAsync: mutateAsyncMock }),
		},
	},
}));
vi.mock("@/app/actions", () => ({
	refreshRoute: refreshMock,
}));
vi.mock("@/hooks/participant/use-participant-search", () => ({
	useParticipantSearch: () => ({
		page: 0,
		setPage: vi.fn(),
		search: "",
		setSearch: vi.fn(),
		hasMore: false,
		setHasMore: vi.fn(),
		isSearching: false,
		isDebouncing: false,
		data: undefined,
		isFetching: false,
		isError: state.isError,
		refetch: refetchMock,
	}),
}));
vi.mock("@/hooks/participant/use-participant-selection", () => ({
	useParticipantSelection: () => ({
		selectedParticipants: state.selected ? [participant] : [],
		toggleSelection: vi.fn(),
		isSelected: () => true,
		clearSelection: vi.fn(),
	}),
}));
vi.mock("@/hooks/use-infinite-scroll", () => ({
	useInfiniteScroll: () => ({ current: null }),
}));
vi.mock("../participant-item", () => ({
	ParticipantItem: () => <li>Ana</li>,
}));

describe("AddUsersDialog", () => {
	it("mostra o erro da mutação sem derrubar a página", async () => {
		mutateAsyncMock.mockRejectedValue(new Error("FORBIDDEN"));
		vi.spyOn(console, "error").mockImplementation(() => {});
		renderInEventTimeZone(
			<AddUsersDialog
				projectId="project-1"
				activityId="activity-1"
				alreadyAdded={[]}
			>
				<button type="button">Adicionar monitores</button>
			</AddUsersDialog>,
		);

		fireEvent.click(screen.getByText("Adicionar monitores"));
		fireEvent.click(
			await screen.findByRole("button", { name: "Adicionar" }),
		);

		await vi.waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
		expect(screen.queryByText("quebrou")).toBeNull();
	});

	it("mostra o erro da busca com a opção de tentar de novo", async () => {
		state.isError = true;
		state.selected = false;
		renderInEventTimeZone(
			<AddUsersDialog
				projectId="project-1"
				checkIn={{ activityId: "a1" }}
			>
				<button type="button">Credenciar por nome</button>
			</AddUsersDialog>,
		);

		fireEvent.click(screen.getByText("Credenciar por nome"));
		expect(
			await screen.findByText(
				"Não foi possível carregar os participantes.",
			),
		).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		expect(refetchMock).toHaveBeenCalled();
	});

	it("fecha o diálogo a cada envio, mesmo com a mesma quantidade", async () => {
		const handler = vi.fn(async () => {});
		renderInEventTimeZone(
			<AddUsersDialog projectId="project-1" onSubmitSelected={handler}>
				<button type="button">Credenciar por nome</button>
			</AddUsersDialog>,
		);

		for (const round of [1, 2]) {
			fireEvent.click(screen.getByText("Credenciar por nome"));
			fireEvent.click(
				await screen.findByRole("button", { name: "Adicionar" }),
			);
			await vi.waitFor(() =>
				expect(handler).toHaveBeenCalledTimes(round),
			);
			await vi.waitFor(() =>
				expect(
					screen.queryByRole("dialog"),
					`rodada ${round}`,
				).toBeNull(),
			);
		}
	});

	it("não acusa erro quando só a atualização da rota falha", async () => {
		refreshMock.mockRejectedValueOnce(new Error("rede"));
		vi.spyOn(console, "error").mockImplementation(() => {});
		const handler = vi.fn(async () => {});
		renderInEventTimeZone(
			<AddUsersDialog projectId="project-1" onSubmitSelected={handler}>
				<button type="button">Credenciar por nome</button>
			</AddUsersDialog>,
		);

		fireEvent.click(screen.getByText("Credenciar por nome"));
		fireEvent.click(
			await screen.findByRole("button", { name: "Adicionar" }),
		);

		await vi.waitFor(() => expect(refreshMock).toHaveBeenCalled());
		expect(toastErrorMock).not.toHaveBeenCalled();
	});

	it("mostra o motivo dado pelo servidor", async () => {
		const reason = "Participante não está inscrito na atividade";
		const handler = vi.fn(async () => {
			throw new TRPCClientError(reason, {
				result: {
					error: {
						message: reason,
						code: -32600,
						data: { code: "BAD_REQUEST" },
					},
				},
			} as never);
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		renderInEventTimeZone(
			<AddUsersDialog projectId="project-1" onSubmitSelected={handler}>
				<button type="button">Credenciar por nome</button>
			</AddUsersDialog>,
		);

		fireEvent.click(screen.getByText("Credenciar por nome"));
		fireEvent.click(
			await screen.findByRole("button", { name: "Adicionar" }),
		);

		await vi.waitFor(() =>
			expect(toastErrorMock).toHaveBeenCalledWith(
				"Não foi possível concluir",
				{ description: reason },
			),
		);
	});
});
