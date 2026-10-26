// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePublicSession } from "@/hooks/use-public-session";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { getSession } }));

function wrapper({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={new QueryClient()}>
			{children}
		</QueryClientProvider>
	);
}

afterEach(() => {
	document.cookie = "verific_has_session=; max-age=0; path=/";
	getSession.mockReset();
});

describe("usePublicSession", () => {
	it("trata como anônimo, sem buscar, quem não tem o marcador", () => {
		const { result } = renderHook(() => usePublicSession(), { wrapper });

		expect(result.current).toEqual({ data: null, isPending: false });
		expect(getSession).not.toHaveBeenCalled();
	});

	it("busca a sessão quando há marcador", async () => {
		document.cookie = "verific_has_session=1; path=/";
		getSession.mockResolvedValue({ data: { user: { id: "u1" } } });

		const { result } = renderHook(() => usePublicSession(), { wrapper });

		await waitFor(() =>
			expect(result.current.data).toEqual({ user: { id: "u1" } }),
		);
	});
});
