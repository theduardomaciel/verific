// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	QuickJoinDialog,
	type QuickJoinActivity,
} from "@/components/activity/quick-join-dialog";

afterEach(cleanup);

const {
	mutateAsyncMock,
	invalidateSubscribedMock,
	invalidateActivitiesMock,
	revalidateSubscribedMock,
	revalidateActivitiesMock,
} = vi.hoisted(() => ({
	mutateAsyncMock: vi.fn(),
	invalidateSubscribedMock: vi.fn(),
	invalidateActivitiesMock: vi.fn(),
	revalidateSubscribedMock: vi.fn(),
	revalidateActivitiesMock: vi.fn(),
}));

vi.mock("@/lib/trpc/react", () => ({
	trpc: {
		useUtils: () => ({
			getSubscribedActivitiesIdsFromParticipant: {
				invalidate: invalidateSubscribedMock,
			},
			getActivitiesFromParticipant: {
				invalidate: invalidateActivitiesMock,
			},
		}),
		addActivityParticipants: {
			useMutation: () => ({ mutateAsync: mutateAsyncMock }),
		},
	},
}));

vi.mock("@/app/actions", () => ({
	revalidateSubscribedActivitiesIdsFromParticipant: revalidateSubscribedMock,
	revalidateParticipantActivities: revalidateActivitiesMock,
}));

// Fixture parcial: o diálogo só lê `id`, `name` e `sessions`.
const activity = {
	id: "act-1",
	name: "Oficina de Cerâmica",
	sessions: [
		{
			startsAt: new Date("2026-11-10T14:00:00-03:00"),
			endsAt: new Date("2026-11-10T16:00:00-03:00"),
			address: "Sala 3",
		},
		{
			startsAt: new Date("2026-11-11T14:00:00-03:00"),
			endsAt: new Date("2026-11-11T16:00:00-03:00"),
			address: "Sala 3",
		},
	],
} as QuickJoinActivity;

function setup(overrides?: {
	onJoined?: (a: QuickJoinActivity) => void;
	onBlocked?: (a: QuickJoinActivity, r: string) => void;
	onOpenChange?: (open: boolean) => void;
}) {
	vi.clearAllMocks();
	mutateAsyncMock.mockResolvedValue({ ok: true });
	const onJoined = vi.fn(overrides?.onJoined);
	const onBlocked = vi.fn(overrides?.onBlocked);
	const onOpenChange = vi.fn(overrides?.onOpenChange);
	render(
		<QuickJoinDialog
			activity={activity}
			participantId="part-1"
			userId="user-1"
			open
			onOpenChange={onOpenChange}
			onJoined={onJoined}
			onBlocked={onBlocked}
		/>,
	);
	return { onJoined, onBlocked, onOpenChange };
}

describe("QuickJoinDialog", () => {
	it("mostra nome, todas as sessões e o aviso multi-sessão", () => {
		setup();

		expect(
			screen.getByRole("alertdialog", { name: "Confirmar inscrição?" }),
		).toBeInTheDocument();
		expect(screen.getByText("Oficina de Cerâmica")).toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(
			screen.getByText("Esta inscrição vale para todas as sessões."),
		).toBeInTheDocument();
	});

	it("cancelar fecha sem inscrever", () => {
		const { onOpenChange } = setup();

		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(mutateAsyncMock).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("confirma uma vez mesmo com duplo clique", async () => {
		const { onJoined } = setup();
		let release!: () => void;
		mutateAsyncMock.mockReturnValueOnce(
			new Promise((resolve) => {
				release = () => resolve({ ok: true });
			}),
		);

		const confirm = screen.getByRole("button", {
			name: "Confirmar inscrição",
		});
		fireEvent.click(confirm);
		fireEvent.click(confirm);
		release();

		await screen.findByText("Oficina de Cerâmica");
		expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		expect(onJoined).toHaveBeenCalledWith(activity);
	});

	it("conflito de corrida sobe como bloqueio tipado", async () => {
		const { onBlocked, onJoined } = setup();
		mutateAsyncMock.mockRejectedValueOnce({
			data: { reason: "SCHEDULE_CONFLICT" },
			message: "rejeitado",
		});

		fireEvent.click(
			screen.getByRole("button", { name: "Confirmar inscrição" }),
		);

		await screen.findByText("Oficina de Cerâmica");
		expect(onBlocked).toHaveBeenCalledWith(activity, "conflict");
		expect(onJoined).not.toHaveBeenCalled();
	});

	it("erro desconhecido fica inline com retry habilitado", async () => {
		setup();
		mutateAsyncMock.mockRejectedValueOnce({
			message: "fetch failed",
		});

		fireEvent.click(
			screen.getByRole("button", { name: "Confirmar inscrição" }),
		);

		await screen.findByRole("alert");
		expect(
			screen.getByText(
				"Não foi possível concluir a inscrição. Tente novamente.",
			),
		).toBeInTheDocument();
		const retry = screen.getByRole("button", {
			name: "Confirmar inscrição",
		});
		expect(retry).toBeEnabled();
	});

	it("lotada, fechada e formulário sobem como bloqueio tipado", async () => {
		for (const [reason, code] of [
			["ACTIVITY_FULL", "full"],
			["REGISTRATION_CLOSED", "closed"],
			["FORM_REQUIRED", "form-required"],
		] as const) {
			const { onBlocked, onJoined } = setup();
			mutateAsyncMock.mockRejectedValueOnce({
				data: { reason },
				message: "rejeitado",
			});

			fireEvent.click(
				screen.getByRole("button", { name: "Confirmar inscrição" }),
			);

			await screen.findByText("Oficina de Cerâmica");
			expect(onBlocked).toHaveBeenCalledWith(activity, code);
			expect(onJoined).not.toHaveBeenCalled();
			cleanup();
		}
	});
});
