// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useActivityEnrollmentState } from "@/components/activity-join/use-activity-enrollment-state";

afterEach(cleanup);

const { subscribedMock, publishedMock, enrolledMock } = vi.hoisted(() => ({
	subscribedMock: vi.fn(),
	publishedMock: vi.fn(),
	enrolledMock: vi.fn(),
}));

vi.mock("@/hooks/use-subscribed-activities", () => ({
	useSubscribedActivities: subscribedMock,
}));

vi.mock("@/lib/trpc/react", () => ({
	trpc: {
		getPublishedForm: { useQuery: publishedMock },
		getActivitiesFromParticipant: { useQuery: enrolledMock },
	},
}));

const FUTURE = {
	startsAt: new Date("2026-11-10T14:00:00-03:00"),
	endsAt: new Date("2026-11-10T16:00:00-03:00"),
};
const OVERLAPPING = {
	startsAt: new Date("2026-11-10T15:00:00-03:00"),
	endsAt: new Date("2026-11-10T17:00:00-03:00"),
};

// Fixture parcial: a máquina lê `id`, `projectId`, flags, `sessions`.
const activity = {
	id: "act-1",
	projectId: "proj-1",
	name: "Alvo",
	isRegistrationOpen: true,
	participantsLimit: 30,
	workload: 2,
	tolerance: null,
	hasForm: false,
	sessions: [FUTURE],
} as Parameters<typeof useActivityEnrollmentState>[0]["activity"];

function enrolledActivity(id: string, session: typeof FUTURE) {
	return {
		id,
		name: `Inscrita ${id}`,
		workload: 2,
		sessions: [session],
	};
}

function setup(overrides?: {
	subscribedIds?: string[];
	enrolled?: ReturnType<typeof enrolledActivity>[];
	enrolledPending?: boolean;
	enrolledError?: boolean;
}) {
	subscribedMock.mockReturnValue({
		userId: "user-1",
		participantId: "part-1",
		subscribedIds: overrides?.subscribedIds ?? [],
		isPending: false,
	});
	publishedMock.mockReturnValue({
		data: { fields: [], sections: [] },
		isPending: false,
	});
	enrolledMock.mockReturnValue({
		data: overrides?.enrolledError
			? undefined
			: {
					activities: overrides?.enrolled ?? [],
					participantId: "part-1",
				},
		isPending: overrides?.enrolledPending ?? false,
		isError: overrides?.enrolledError ?? false,
	});
	return renderHook(() =>
		useActivityEnrollmentState({
			activity,
			eventUrl: "evento",
			participantsCount: 0,
		}),
	);
}

describe("useActivityEnrollmentState schedule-conflict", () => {
	it("bloqueia com conflito e carrega os conflitos", () => {
		const { result } = setup({
			enrolled: [enrolledActivity("act-2", OVERLAPPING)],
		});

		expect(result.current.state).toBe("schedule-conflict");
		expect(result.current.conflicts).toHaveLength(1);
		expect(result.current.conflicts[0]?.otherActivity.id).toBe("act-2");
	});

	it("vira form sem conflito", () => {
		const { result } = setup();

		expect(result.current.state).toBe("form");
		expect(result.current.conflicts).toHaveLength(0);
	});

	it("segura loading enquanto as inscritas carregam no caminho do form", () => {
		const { result } = setup({ enrolledPending: true });

		expect(result.current.state).toBe("loading");
	});

	it("cai no form se a leitura de inscritas falhar (servidor impõe)", () => {
		const { result } = setup({ enrolledError: true });

		expect(result.current.state).toBe("form");
	});

	it("já inscrito continua já inscrito mesmo com sobreposição", () => {
		const { result } = setup({
			subscribedIds: ["act-1"],
			enrolled: [enrolledActivity("act-2", OVERLAPPING)],
		});

		expect(result.current.state).toBe("already-subscribed");
	});
});
