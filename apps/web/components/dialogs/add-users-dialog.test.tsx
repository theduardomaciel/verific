// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AddUsersDialog } from "@/components/dialogs/add-users-dialog";

afterEach(cleanup);

const { mutateAsyncMock, toastErrorMock } = vi.hoisted(() => ({
	mutateAsyncMock: vi.fn(),
	toastErrorMock: vi.fn(),
}));

const participant = { id: "p1", userId: "u1", user: { name: "Ana" } };

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
	refreshRoute: vi.fn(),
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
		setIsSearching: vi.fn(),
		isDebouncing: false,
		data: undefined,
		isFetching: false,
	}),
}));
vi.mock("@/hooks/participant/use-participant-selection", () => ({
	useParticipantSelection: () => ({
		selectedParticipants: [participant],
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
		render(
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
});
