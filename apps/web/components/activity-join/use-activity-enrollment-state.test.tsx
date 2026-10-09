// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useActivityEnrollmentState } from "@/components/activity-join/use-activity-enrollment-state";

afterEach(cleanup);

const { subscribedMock, publishedMock, enrolledMock, waitlistMock } =
	vi.hoisted(() => ({
		subscribedMock: vi.fn(),
		publishedMock: vi.fn(),
		enrolledMock: vi.fn(),
		waitlistMock: vi.fn(),
	}));

vi.mock("@/hooks/use-subscribed-activities", () => ({
	useSubscribedActivities: subscribedMock,
}));

vi.mock("@/lib/trpc/react", () => ({
	trpc: {
		getPublishedForm: { useQuery: publishedMock },
		getActivitiesFromParticipant: { useQuery: enrolledMock },
		getMyWaitlistEntries: { useQuery: waitlistMock },
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
	waitlistEnabled: true,
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
	participantsCount?: number;
	waitlist?: { activityId: string; status: "waiting" | "offered" }[];
	waitlistPending?: boolean;
	activity?: Partial<typeof activity>;
}) {
	waitlistMock.mockReturnValue({
		data: overrides?.waitlistPending
			? undefined
			: (overrides?.waitlist ?? []),
		isPending: overrides?.waitlistPending ?? false,
	});
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
			activity: {
				...activity,
				...overrides?.activity,
			} as typeof activity,
			eventUrl: "evento",
			participantsCount: overrides?.participantsCount ?? 0,
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

describe("useActivityEnrollmentState fila de espera", () => {
	it("atividade lotada vira entrada na fila", () => {
		const { result } = setup({ participantsCount: 30 });

		expect(result.current.state).toBe("waitlist");
	});

	it("conflito de horário vem antes da fila", () => {
		const { result } = setup({
			participantsCount: 30,
			enrolled: [enrolledActivity("act-2", OVERLAPPING)],
		});

		expect(result.current.state).toBe("schedule-conflict");
	});

	it("quem está na fila vê o próprio lugar", () => {
		const { result } = setup({
			participantsCount: 30,
			waitlist: [{ activityId: "act-1", status: "waiting" }],
		});

		expect(result.current.state).toBe("waitlisted");
	});

	it("quem recebeu oferta vê a oferta, mesmo com conflito", () => {
		const { result } = setup({
			waitlist: [{ activityId: "act-1", status: "offered" }],
			enrolled: [enrolledActivity("act-2", OVERLAPPING)],
		});

		expect(result.current.state).toBe("offered");
	});

	it("ignora a fila de outras atividades", () => {
		const { result } = setup({
			waitlist: [{ activityId: "act-9", status: "offered" }],
		});

		expect(result.current.state).toBe("form");
	});

	it("segura loading enquanto a fila carrega", () => {
		const { result } = setup({ waitlistPending: true });

		expect(result.current.state).toBe("loading");
	});
});

describe("useActivityEnrollmentState fila desligada", () => {
	it("lotada sem fila vira full, sem ação de fila", () => {
		const { result } = setup({
			participantsCount: 30,
			activity: { waitlistEnabled: false },
		});

		expect(result.current.state).toBe("full");
	});

	it("lotada com fila segue em waitlist", () => {
		const { result } = setup({
			participantsCount: 30,
			activity: { waitlistEnabled: true },
		});

		expect(result.current.state).toBe("waitlist");
	});

	it("full vence o conflito quando não há ação de fila", () => {
		const { result } = setup({
			participantsCount: 30,
			activity: { waitlistEnabled: false },
			enrolled: [enrolledActivity("act-2", OVERLAPPING)],
		});

		expect(result.current.state).toBe("full");
	});

	it("quem já está na fila continua nela mesmo desligada", () => {
		const { result } = setup({
			participantsCount: 30,
			activity: { waitlistEnabled: false },
			waitlist: [{ activityId: "act-1", status: "waiting" }],
		});

		expect(result.current.state).toBe("waitlisted");
	});

	it("quem tem oferta continua na oferta mesmo desligada", () => {
		const { result } = setup({
			activity: { waitlistEnabled: false },
			waitlist: [{ activityId: "act-1", status: "offered" }],
		});

		expect(result.current.state).toBe("offered");
	});
});
