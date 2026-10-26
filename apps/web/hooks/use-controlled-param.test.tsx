// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useControlledParam } from "@/hooks/use-controlled-param";

const { push, search } = vi.hoisted(() => ({
	push: vi.fn(),
	search: { value: "" },
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push }),
	usePathname: () => "/evento/schedule",
	useSearchParams: () => new URLSearchParams(search.value),
}));

const resetKeys = [{ key: "page", defaultValue: "1" }];

beforeEach(() => {
	vi.useFakeTimers();
	push.mockClear();
});

describe("useControlledParam", () => {
	it("não navega ao montar", () => {
		search.value = "sort=name&page=3";
		const { result } = renderHook(() =>
			useControlledParam({
				key: "sort",
				defaultValue: "date",
				resetKeys,
			}),
		);

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(result.current.value).toBe("name");
		expect(push).not.toHaveBeenCalled();
	});

	it("usa o valor padrão quando a URL não tem o parâmetro", () => {
		search.value = "";
		const { result } = renderHook(() =>
			useControlledParam({ key: "sort", defaultValue: "date" }),
		);

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(result.current.value).toBe("date");
		expect(push).not.toHaveBeenCalled();
	});

	it("navega quando o valor muda", () => {
		search.value = "sort=name&page=3";
		const { result } = renderHook(() =>
			useControlledParam({ key: "sort", resetKeys }),
		);

		act(() => {
			result.current.setValue("date");
		});
		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(push).toHaveBeenCalledWith("/evento/schedule?sort=date&page=1", {
			scroll: false,
		});
	});
});
