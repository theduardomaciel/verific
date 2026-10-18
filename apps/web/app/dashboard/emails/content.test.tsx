// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicNotification } from "@verific/api";

const { state } = vi.hoisted(() => ({
	state: {
		items: [] as unknown[],
		counts: {
			pending: 1,
			sending: 0,
			stuck: 1,
			sent: 1,
			failed: 2,
			blocked_quota: 0,
			skipped: 0,
		},
		usage: { sentLast24h: 0, limit: null as number | null },
		mutateAsync: vi.fn(),
		invalidate: vi.fn(async () => {}),
		toast: {
			success: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			warning: vi.fn(),
		},
	},
}));

vi.mock("@/lib/trpc/react", () => ({
	trpc: {
		useUtils: () => ({
			listNotifications: { invalidate: state.invalidate },
			statsNotifications: { invalidate: state.invalidate },
		}),
		statsNotifications: {
			useQuery: vi.fn(() => ({
				data: { counts: state.counts, usage: state.usage },
				isPending: false,
				isError: false,
				refetch: vi.fn(),
			})),
		},
		listNotifications: {
			useQuery: vi.fn(() => ({
				data: { items: state.items, nextCursor: null },
				isPending: false,
				isError: false,
				isFetching: false,
				refetch: vi.fn(),
			})),
		},
		reprocessOneNotification: {
			useMutation: () => ({ mutateAsync: state.mutateAsync }),
		},
		reprocessBatchNotifications: {
			useMutation: () => ({ mutateAsync: vi.fn(async () => ({})) }),
		},
	},
}));

vi.mock("@/components/dashboard/dashboard-context", () => ({
	useDashboard: () => ({
		projectId: "22222222-2222-4222-8222-222222222222",
		projectUrl: "evento",
	}),
}));

vi.mock("sonner", () => ({ toast: state.toast }));

import { trpc } from "@/lib/trpc/react";

import { EmailsContent } from "./content";

const listQueryMock = vi.mocked(trpc.listNotifications.useQuery);

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	state.items = [];
	state.usage = { sentLast24h: 0, limit: null };
});

function row(overrides: Partial<PublicNotification> = {}): PublicNotification {
	return {
		id: "11111111-1111-4111-8111-111111111111",
		type: "event_registration_confirmation",
		idempotencyKey: "event_registration_confirmation:1",
		eventId: "22222222-2222-4222-8222-222222222222",
		recipientEmail: "abigail@ic.ufal.br",
		subject: "Inscrição confirmada",
		templateVersion: "v3",
		status: "failed",
		skipReason: null,
		propsHash: "a".repeat(64),
		entityRefs: { registrationId: "11111111-1111-4111-8111-111111111111" },
		stuck: false,
		attempts: 3,
		lastError:
			"validation_error: endereço inválido — verifique o destinatário e tente novamente com um endereço válido.",
		lastErrorRetryable: false,
		provider: "resend",
		providerMessageId: null,
		createdAt: new Date("2026-10-18T12:00:00.000Z"),
		updatedAt: new Date("2026-10-18T12:05:00.000Z"),
		sentAt: null,
		...overrides,
	};
}

function stubClipboard() {
	const writeText = vi.fn(async (_text: string) => {});
	vi.stubGlobal("navigator", { clipboard: { writeText } });
	return writeText;
}

describe("EmailsContent filters", () => {
	it("filters the table when a counter is clicked and marks it active", async () => {
		state.items = [row()];
		render(<EmailsContent />);

		const falhas = screen.getByRole("button", { name: /^Falhas/ });
		fireEvent.click(falhas);

		await waitFor(() => {
			expect(listQueryMock.mock.calls.at(-1)?.[0]).toMatchObject({
				filter: "failed",
			});
		});
		expect(falhas).toHaveAttribute("aria-pressed", "true");
		expect(
			screen.getByRole("button", { name: /Limpar filtro/ }),
		).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: /Limpar filtro/ }));
		await waitFor(() => {
			expect(listQueryMock.mock.calls.at(-1)?.[0]).toMatchObject({
				filter: "attention",
			});
		});
	});

	it("applies the recipient e-mail search after the debounce", async () => {
		state.items = [row()];
		render(<EmailsContent />);

		fireEvent.change(
			screen.getByLabelText("Buscar por e-mail do destinatário"),
			{ target: { value: "maria@ic.ufal.br" } },
		);

		await waitFor(
			() => {
				expect(listQueryMock.mock.calls.at(-1)?.[0]).toMatchObject({
					email: "maria@ic.ufal.br",
				});
			},
			{ timeout: 2000 },
		);
	});
});

describe("EmailsContent copy actions", () => {
	it("copies the full stored error with a toast", async () => {
		const item = row();
		state.items = [item];
		const writeText = stubClipboard();
		render(<EmailsContent />);

		fireEvent.click(screen.getByLabelText("Copiar erro"));

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith(item.lastError);
		});
		expect(state.toast.success).toHaveBeenCalledWith(
			expect.stringContaining("Erro copiado"),
		);
	});

	it("copies a diagnostic with masked e-mail and no secrets", async () => {
		state.items = [
			row({
				providerMessageId: "ses-secret-id",
				propsHash: "f".repeat(64),
			}),
		];
		const writeText = stubClipboard();
		render(<EmailsContent />);

		fireEvent.click(screen.getByLabelText("Copiar diagnóstico"));

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledTimes(1);
		});
		const copied = writeText.mock.calls[0]![0] as string;
		expect(copied).toContain("ab***@ic.ufal.br");
		expect(copied).not.toContain("abigail@ic.ufal.br");
		expect(copied).toContain("id: 11111111-1111-4111-8111-111111111111");
		expect(copied).toContain("entityRefs:");
		expect(copied).not.toContain("ses-secret-id");
		expect(copied).not.toContain("f".repeat(64));
		expect(state.toast.success).toHaveBeenCalledWith(
			expect.stringContaining("Diagnóstico copiado"),
		);
	});

	it("expands a long error without leaving the page", async () => {
		state.items = [row()];
		render(<EmailsContent />);

		const errorText = screen.getByTestId("error-text");
		expect(errorText.className).toContain("line-clamp-2");

		fireEvent.click(screen.getByTestId("error-toggle"));

		expect(screen.getByTestId("error-text").className).not.toContain(
			"line-clamp-2",
		);
	});
});

describe("EmailsContent reprocess button", () => {
	it("disables reprocessing for sent rows with an explanatory label", () => {
		state.items = [row({ status: "sent", sentAt: new Date() })];
		render(<EmailsContent />);

		const button = screen.getByRole("button", {
			name: /Reprocessar indisponível/,
		});
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute(
			"aria-label",
			expect.stringContaining("Já enviada"),
		);
	});

	it("reprocesses a failed row, shows pending state and reports the outcome", async () => {
		state.items = [row()];
		let resolve!: (value: { notification: { status: string } }) => void;
		state.mutateAsync.mockImplementation(
			() =>
				new Promise((r) => {
					resolve = r;
				}),
		);
		render(<EmailsContent />);

		fireEvent.click(
			screen.getByRole("button", { name: "Reprocessar este e-mail" }),
		);

		await waitFor(() => {
			expect(state.mutateAsync).toHaveBeenCalledWith({
				projectId: "22222222-2222-4222-8222-222222222222",
				id: "11111111-1111-4111-8111-111111111111",
			});
		});
		const button = screen.getByRole("button", {
			name: "Reprocessar este e-mail",
		});
		expect(button).toBeDisabled(); // pending state

		resolve({ notification: { status: "sent" } });
		await waitFor(() => {
			expect(state.toast.success).toHaveBeenCalledWith(
				expect.stringContaining("reprocessado"),
			);
		});
	});
});

describe("EmailsContent reload and auto-refresh", () => {
	it("reloads the list and the counters and debounces repeat clicks", async () => {
		state.items = [row()];
		render(<EmailsContent />);

		const reload = screen.getByLabelText("Recarregar lista e contagens");
		fireEvent.click(reload);

		await waitFor(() => {
			expect(state.invalidate).toHaveBeenCalledTimes(2);
		});
		expect(reload).toBeDisabled();

		fireEvent.click(reload);
		expect(state.invalidate).toHaveBeenCalledTimes(2);
	});

	it("enables the automatic refresh interval when the switch is toggled", () => {
		state.items = [row()];
		render(<EmailsContent />);

		expect(
			(
				listQueryMock.mock.calls.at(-1)?.[1] as {
					refetchInterval?: unknown;
				}
			)?.refetchInterval,
		).toBe(false);

		fireEvent.click(screen.getByLabelText("Atualização automática"));

		expect(
			(
				listQueryMock.mock.calls.at(-1)?.[1] as {
					refetchInterval?: unknown;
				}
			)?.refetchInterval,
		).toBe(15_000);
	});
});

describe("EmailsContent bulk selection", () => {
	it("selects every reprocessable row and reprocesses them after confirmation", async () => {
		state.items = [
			row({ id: "11111111-1111-4111-8111-111111111111" }),
			row({ id: "33333333-3333-4333-8333-333333333333" }),
		];
		state.mutateAsync = vi.fn(async () => ({
			notification: { status: "sent" },
		}));
		render(<EmailsContent />);

		fireEvent.click(
			screen.getByLabelText(
				"Selecionar e-mails reprocessáveis desta página",
			),
		);
		expect(screen.getByText(/2 selecionados/)).toBeTruthy();

		fireEvent.click(
			screen.getByRole("button", { name: "Reprocessar selecionados" }),
		);
		fireEvent.click(
			await screen.findByRole("button", { name: "Reprocessar" }),
		);

		await waitFor(() => {
			expect(state.mutateAsync).toHaveBeenCalledTimes(2);
		});
		expect(state.mutateAsync).toHaveBeenCalledWith({
			projectId: "22222222-2222-4222-8222-222222222222",
			id: "11111111-1111-4111-8111-111111111111",
		});
		expect(state.mutateAsync).toHaveBeenCalledWith({
			projectId: "22222222-2222-4222-8222-222222222222",
			id: "33333333-3333-4333-8333-333333333333",
		});
	});

	it("disables the checkbox of a non-reprocessable row", () => {
		state.items = [row({ status: "sent", sentAt: new Date() })];
		render(<EmailsContent />);

		expect(
			screen.getByLabelText(/Não selecionável: Já enviada/),
		).toBeDisabled();
	});
});

describe("EmailsContent detail sheet", () => {
	it("opens the sheet with entityRefs and the stored error", async () => {
		state.items = [row()];
		render(<EmailsContent />);

		fireEvent.click(screen.getByLabelText("Ver detalhes"));

		expect(await screen.findByText("Detalhes da notificação")).toBeTruthy();
		const dialog = screen.getByRole("dialog");
		expect(within(dialog).getByText("entityRefs")).toBeTruthy();
		expect(within(dialog).getByText(/registrationId/)).toBeTruthy();
		expect(within(dialog).getByText(/validation_error/)).toBeTruthy();
	});
});
