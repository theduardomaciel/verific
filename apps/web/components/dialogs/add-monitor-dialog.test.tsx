import { Component, type ReactNode } from "react";

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AddMonitorDialog } from "@/components/dialogs/add-monitor-dialog";

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
	},
}));
vi.mock("@/app/actions", () => ({
	revalidateParticipantActivities: vi.fn(),
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

class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
	state = { error: false };
	static getDerivedStateFromError() {
		return { error: true };
	}
	render() {
		return this.state.error ? <p>quebrou</p> : this.props.children;
	}
}

describe("AddMonitorDialog", () => {
	it("mostra o erro da mutação sem derrubar a página", async () => {
		mutateAsyncMock.mockRejectedValue(new Error("FORBIDDEN"));
		vi.spyOn(console, "error").mockImplementation(() => {});
		render(
			<Boundary>
				<AddMonitorDialog
					projectId="project-1"
					activityId="activity-1"
					alreadyAdded={[]}
				/>
			</Boundary>,
		);

		fireEvent.click(screen.getByText("Adicionar monitores"));
		fireEvent.click(
			await screen.findByRole("button", { name: "Adicionar" }),
		);

		await vi.waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
		expect(screen.queryByText("quebrou")).toBeNull();
	});
});
