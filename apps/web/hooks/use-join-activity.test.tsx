// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { toJoinError, useJoinActivity } from "@/hooks/use-join-activity";

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

function setup() {
	vi.clearAllMocks();
	mutateAsyncMock.mockResolvedValue({ ok: true });
	revalidateSubscribedMock.mockResolvedValue(undefined);
	revalidateActivitiesMock.mockResolvedValue(undefined);
	invalidateSubscribedMock.mockResolvedValue(undefined);
	invalidateActivitiesMock.mockResolvedValue(undefined);
	return renderHook(() =>
		useJoinActivity({
			activityId: "act-1",
			participantId: "part-1",
			userId: "user-1",
		}),
	);
}

function serverError(reason: string) {
	return { data: { reason }, message: "falhou" };
}

describe("toJoinError", () => {
	it("mapeia os motivos do servidor", () => {
		expect(toJoinError(serverError("FORM_REQUIRED"))).toBe("form-required");
		expect(toJoinError(serverError("ACTIVITY_FULL"))).toBe("full");
		expect(toJoinError(serverError("REGISTRATION_CLOSED"))).toBe("closed");
		expect(toJoinError(serverError("SCHEDULE_CONFLICT"))).toBe("conflict");
		expect(toJoinError(serverError("WAITLIST_DISABLED"))).toBe("disabled");
	});

	it("retorna unknown para o resto", () => {
		expect(toJoinError(new Error("fetch failed"))).toBe("unknown");
		expect(toJoinError(serverError("SOMETHING_ELSE"))).toBe("unknown");
		expect(toJoinError({ message: "sem data" })).toBe("unknown");
		expect(toJoinError(null)).toBe("unknown");
	});
});

describe("useJoinActivity", () => {
	it("inscreve, revalida em paralelo e retorna nulo", async () => {
		const { result } = setup();

		let joinError: unknown = "pending";
		await act(async () => {
			joinError = await result.current.join();
		});

		expect(joinError).toBeNull();
		expect(mutateAsyncMock).toHaveBeenCalledWith({
			activityId: "act-1",
			participantsIdsToAdd: ["part-1"],
		});
		expect(revalidateSubscribedMock).toHaveBeenCalledWith("user-1");
		expect(revalidateActivitiesMock).toHaveBeenCalledWith("user-1");
		expect(invalidateSubscribedMock).toHaveBeenCalled();
		expect(invalidateActivitiesMock).toHaveBeenCalled();
		expect(result.current.status).toBe("success");
		expect(result.current.error).toBeNull();
	});

	it("envia as respostas quando há formulário", async () => {
		const { result } = setup();
		const answers = { nome: "Fulano" };

		await act(async () => {
			await result.current.join(answers);
		});

		expect(mutateAsyncMock).toHaveBeenCalledWith({
			activityId: "act-1",
			participantsIdsToAdd: ["part-1"],
			formAnswers: { answers },
		});
	});

	it("mapeia cada falha e mantém o estado para retry", async () => {
		for (const [reason, kind] of [
			["FORM_REQUIRED", "form-required"],
			["ACTIVITY_FULL", "full"],
			["REGISTRATION_CLOSED", "closed"],
			["OUTRO", "unknown"],
		] as const) {
			const { result, unmount } = setup();
			mutateAsyncMock.mockRejectedValueOnce(serverError(reason));

			let joinError: unknown = null;
			await act(async () => {
				joinError = await result.current.join();
			});

			expect(joinError).toBe(kind);
			expect(result.current.status).toBe("error");
			expect(result.current.error).toBe(kind);
			unmount();
		}
	});

	it("no conflito, atualiza as leituras de inscrição", async () => {
		const { result } = setup();
		mutateAsyncMock.mockRejectedValueOnce(serverError("SCHEDULE_CONFLICT"));

		let joinError: unknown = null;
		await act(async () => {
			joinError = await result.current.join();
		});

		expect(joinError).toBe("conflict");
		expect(result.current.status).toBe("error");
		expect(invalidateSubscribedMock).toHaveBeenCalled();
		expect(invalidateActivitiesMock).toHaveBeenCalled();
	});

	it("reset volta ao ocioso", async () => {
		const { result } = setup();
		mutateAsyncMock.mockRejectedValueOnce(serverError("ACTIVITY_FULL"));

		await act(async () => {
			await result.current.join();
		});
		expect(result.current.status).toBe("error");

		act(() => {
			result.current.reset();
		});
		expect(result.current.status).toBe("idle");
		expect(result.current.error).toBeNull();
	});

	it("chamadas concorrentes disparam uma requisição só", async () => {
		const { result } = setup();
		let release!: () => void;
		mutateAsyncMock.mockReturnValueOnce(
			new Promise((resolve) => {
				release = () => resolve({ ok: true });
			}),
		);

		let first: unknown = "unset";
		let second: unknown = "unset";
		await act(async () => {
			const a = result.current.join();
			const b = result.current.join();
			release();
			first = await a;
			second = await b;
		});

		expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		expect(first).toBeNull();
		expect(second).toBeNull();
		expect(result.current.status).toBe("success");
	});
});
