// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { teamQuery, checkInQuery } = vi.hoisted(() => {
	const result = (_input: unknown, _options: unknown) => ({
		data: undefined,
		isFetching: false,
		isError: false,
		refetch: vi.fn(),
	});
	return {
		teamQuery: vi.fn(result),
		checkInQuery: vi.fn(result),
	};
});

vi.mock("@/lib/trpc/react", () => ({
	trpc: {
		getParticipants: { useQuery: teamQuery },
		searchCheckInCandidates: { useQuery: checkInQuery },
	},
}));

import { useParticipantSearch } from "./use-participant-search";

type QueryOptions = {
	enabled: boolean;
	retry: (count: number, error: { data?: { code?: string } }) => boolean;
};

const lastOptions = (query: typeof teamQuery) =>
	query.mock.lastCall![1] as unknown as QueryOptions;
const lastInput = (query: typeof teamQuery) =>
	query.mock.lastCall![0] as unknown as Record<string, unknown>;

beforeEach(() => {
	vi.clearAllMocks();
});

describe("useParticipantSearch", () => {
	it("does not fetch while the dialog is closed", () => {
		renderHook(() =>
			useParticipantSearch({ projectId: "e1", isOpen: false }),
		);

		expect(lastOptions(teamQuery).enabled).toBe(false);
		expect(lastOptions(checkInQuery).enabled).toBe(false);
	});

	it("asks the team list for its first page, which starts at 1", () => {
		renderHook(() =>
			useParticipantSearch({ projectId: "e1", isOpen: true }),
		);

		expect(lastOptions(teamQuery).enabled).toBe(true);
		expect(lastInput(teamQuery)).toMatchObject({ page: 1 });
		expect(lastOptions(checkInQuery).enabled).toBe(false);
	});

	it("uses the check-in search for the activity", () => {
		renderHook(() =>
			useParticipantSearch({
				projectId: "e1",
				isOpen: true,
				checkIn: { activityId: "a1" },
			}),
		);

		expect(lastOptions(checkInQuery).enabled).toBe(true);
		expect(lastInput(checkInQuery)).toMatchObject({
			activityId: "a1",
			page: 0,
		});
		expect(lastOptions(teamQuery).enabled).toBe(false);
	});

	it("does not retry a forbidden search", () => {
		renderHook(() =>
			useParticipantSearch({ projectId: "e1", isOpen: true }),
		);
		const { retry } = lastOptions(teamQuery);

		expect(retry(0, { data: { code: "FORBIDDEN" } })).toBe(false);
		expect(retry(0, { data: { code: "INTERNAL_SERVER_ERROR" } })).toBe(
			true,
		);
	});
});
