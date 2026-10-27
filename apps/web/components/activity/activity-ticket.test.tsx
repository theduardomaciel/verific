// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActivityTicket, type WorkshopTicketProps } from "./activity-ticket";

afterEach(cleanup);

const { now } = vi.hoisted(() => ({ now: { value: new Date() } }));

vi.mock("@/hooks/use-now", () => ({ useNow: () => now.value }));
vi.mock("@/components/badge-scanner", () => ({
	BadgeScanner: ({ buttonLabel }: { buttonLabel: string }) => (
		<button type="button">{buttonLabel}</button>
	),
}));
vi.mock("@/components/dialogs/add-participants-dialog", () => ({
	AddUsersDialog: () => null,
}));
vi.mock("@/lib/trpc/react", () => ({
	trpc: {
		useUtils: () => ({}),
		updateSessionPresence: { useMutation: () => ({}) },
	},
}));

const end = new Date("2026-10-20T15:00:00.000Z");

function renderMonitorTicket(
	tolerance: number | null,
	minutesAfterEnd: number,
) {
	now.value = new Date(end.getTime() + minutesAfterEnd * 60 * 1000);
	const activity = {
		id: "a1",
		name: "Oficina",
		description: null,
		role: "monitor",
		tolerance,
		participantsLimit: null,
		participantsJoined: 3,
		speakers: [],
		sessions: [
			{
				id: "s1",
				startsAt: new Date("2026-10-20T13:00:00.000Z"),
				endsAt: end,
				joinedAt: null,
				attendedCount: 3,
			},
		],
	} as unknown as WorkshopTicketProps["activity"];
	render(<ActivityTicket activity={activity} checkInCode="abc" />);
}

describe("ActivityTicket", () => {
	it("sem tolerância, mantém o credenciamento depois do fim", () => {
		renderMonitorTicket(null, 600);

		expect(screen.getByText("Escanear crachás")).toBeTruthy();
	});

	it("mantém o credenciamento dentro da tolerância", () => {
		renderMonitorTicket(30, 20);

		expect(screen.getByText("Escanear crachás")).toBeTruthy();
	});

	it("encerra o credenciamento depois da tolerância", () => {
		renderMonitorTicket(30, 31);

		expect(screen.queryByText("Escanear crachás")).toBeNull();
		expect(screen.getByText(/O prazo para credenciamento/)).toBeTruthy();
	});
});
