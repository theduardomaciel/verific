import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateMock, setMock, whereMock, returningMock, findFirstMock } =
	vi.hoisted(() => {
		const returningMock = vi.fn();
		const whereMock = vi.fn(() => ({ returning: returningMock }));
		const setMock = vi.fn(() => ({ where: whereMock }));
		const updateMock = vi.fn(() => ({ set: setMock }));
		const findFirstMock = vi.fn();

		return {
			updateMock,
			setMock,
			whereMock,
			returningMock,
			findFirstMock,
		};
	});

vi.mock("@verific/drizzle", () => ({
	db: {
		update: updateMock,
		query: { participant: { findFirst: findFirstMock } },
	},
}));

import { ensureShortId } from "./profiles";

describe("ensureShortId", () => {
	beforeEach(() => {
		updateMock.mockClear();
		setMock.mockClear();
		whereMock.mockClear();
		returningMock.mockReset();
		findFirstMock.mockReset();
	});

	it("não escreve nem consulta quando o shortId já existe", async () => {
		const shortId = await ensureShortId("participant-1", "already-there");

		expect(shortId).toBe("already-there");
		expect(updateMock).not.toHaveBeenCalled();
		expect(findFirstMock).not.toHaveBeenCalled();
	});

	it("preenche apenas quando o shortId está nulo", async () => {
		returningMock.mockResolvedValueOnce([{ shortId: "generated-id" }]);

		await expect(ensureShortId("participant-1", null)).resolves.toBe(
			"generated-id",
		);

		expect(updateMock).toHaveBeenCalledTimes(1);
		expect(findFirstMock).not.toHaveBeenCalled();
	});

	it("devolve o shortId vencedor se outra requisição preencheu antes", async () => {
		returningMock.mockResolvedValueOnce([]);
		findFirstMock.mockResolvedValueOnce({ shortId: "won-race" });

		await expect(ensureShortId("participant-1", null)).resolves.toBe(
			"won-race",
		);
	});
});
