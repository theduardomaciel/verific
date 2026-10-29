// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ConnectionsCard } from "./profile-connections";

const { infiniteQuery, fetchNextPage } = vi.hoisted(() => ({
	infiniteQuery: vi.fn(),
	fetchNextPage: vi.fn(),
}));

vi.mock("@/lib/trpc/react", () => ({
	trpc: { getProfileConnections: { useInfiniteQuery: infiniteQuery } },
}));

// O Popover do Radix mede o tamanho com ResizeObserver
beforeAll(() => {
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		},
	);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const visitors = Array.from({ length: 7 }, (_, i) => ({
	name: `Pessoa ${i + 1}`,
	avatarUrl: null,
}));

infiniteQuery.mockReturnValue({
	data: {
		pages: [
			{
				connections: [
					{ name: "Pessoa 1", avatarUrl: null },
					{ name: "Pessoa 8", avatarUrl: null },
				],
			},
		],
	},
	isPending: false,
	isError: false,
	hasNextPage: true,
	isFetchingNextPage: false,
	fetchNextPage,
});

function renderCard(profile?: { eventUrl: string; shortId: string }) {
	render(
		<ConnectionsCard
			profile={profile}
			name="Ana"
			connections={{ total: 10, visitors }}
		/>,
	);
}

describe("ConnectionsCard", () => {
	it("busca a lista só depois de aberta, sem links", () => {
		renderCard({ eventUrl: "evento", shortId: "ana" });
		expect(infiniteQuery).not.toHaveBeenCalled();

		fireEvent.click(
			screen.getByRole("button", { name: "e outros 7 participantes" }),
		);

		expect(infiniteQuery).toHaveBeenCalledWith(
			{ projectUrl: "evento", shortId: "ana" },
			expect.anything(),
		);
		const list = screen.getByRole("list", { name: "Todas as conexões" });
		expect(list.textContent).toContain("Pessoa 8");
		expect(screen.queryAllByRole("link")).toHaveLength(0);

		fireEvent.click(screen.getByRole("button", { name: "Ver mais" }));
		expect(fetchNextPage).toHaveBeenCalled();
	});

	it("abre a mesma lista pelo +N, sem tornar os avatares links", () => {
		renderCard({ eventUrl: "evento", shortId: "ana" });

		expect(screen.queryAllByRole("link")).toHaveLength(0);
		fireEvent.click(
			screen.getByRole("button", { name: "Ver todas as 10 conexões" }),
		);
		expect(
			screen.getByRole("list", { name: "Todas as conexões" }),
		).toBeTruthy();
	});

	it("sem o perfil (prévia do tema) não oferece a lista", () => {
		renderCard();

		expect(screen.getByText(/e outros 7 participantes/)).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: "e outros 7 participantes" }),
		).toBeNull();
	});
});
