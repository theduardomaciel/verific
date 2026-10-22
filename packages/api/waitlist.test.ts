import { describe, expect, it, vi } from "vitest";

interface OfferedArgs {
	eventId: string;
	activityId: string;
	offers: Array<{
		participantId: string;
		enrollmentId: string;
		offeredAt: Date;
		expiresAt: Date;
	}>;
}

const { notifyOfferedMock, deleteAnswersMock } = vi.hoisted(() => ({
	notifyOfferedMock: vi.fn<(args: OfferedArgs) => Promise<void>>(
		async () => {},
	),
	deleteAnswersMock: vi.fn(async () => {}),
}));

vi.mock("./notifications", () => ({
	notifyActivityWaitlistOffered: notifyOfferedMock,
}));
vi.mock("./enrollment", () => ({
	deleteActivityAnswers: deleteAnswersMock,
}));

import {
	activitySession,
	activityWaitlist,
	participantOnActivity,
} from "@verific/drizzle/schema";

import { settleActivity } from "./waitlist";

import type { ActiveEntry } from "./waitlist";

/**
 * `settleActivity` is the single point that creates offers (and the only one
 * that triggers the offer e-mail). A settle is idempotent: once an entry is
 * `offered`, a later settle sees no new offer and must not notify again.
 */
function makeTx(args: {
	entries: ActiveEntry[];
	enrolled: number;
	startsAt: Date | null;
	endsAt: Date | null;
}) {
	const { entries, enrolled, startsAt, endsAt } = args;
	return {
		select: () => ({
			from: (table: unknown) => ({
				where: async () => {
					if (table === activityWaitlist) return entries;
					if (table === activitySession)
						return [{ startsAt, endsAt }];
					if (table === participantOnActivity)
						return [{ amount: enrolled }];
					return [];
				},
			}),
		}),
		update: () => ({
			set: (payload: Record<string, unknown>) => ({
				where: async () => {
					for (const entry of entries) Object.assign(entry, payload);
					return [];
				},
			}),
		}),
		insert: () => ({ values: async () => {} }),
	} as never;
}

describe("settleActivity offer notification", () => {
	it("notifies once for a new offer and never again on the next settle", async () => {
		notifyOfferedMock.mockClear();
		deleteAnswersMock.mockClear();

		const now = new Date("2026-01-01T12:00:00.000Z");
		const entries: ActiveEntry[] = [
			{
				id: "e1",
				participantId: "p1",
				status: "waiting",
				joinedAt: new Date("2026-01-01T10:00:00.000Z"),
				offerExpiresAt: null,
			},
		];
		const tx = makeTx({
			entries,
			enrolled: 0,
			startsAt: new Date("2026-01-02T12:00:00.000Z"),
			endsAt: new Date("2026-01-02T18:00:00.000Z"),
		});
		const locked = {
			id: "a1",
			projectId: "pr1",
			participantsLimit: 1,
			waitlistEnabled: true,
			waitlistOfferHours: 12,
			cancelledAt: null,
		};

		const first = await settleActivity(tx, locked, now);
		const second = await settleActivity(tx, locked, now);

		expect(notifyOfferedMock).toHaveBeenCalledTimes(1);
		expect(notifyOfferedMock).toHaveBeenCalledWith({
			eventId: "pr1",
			activityId: "a1",
			offers: [
				{
					participantId: "p1",
					enrollmentId: "e1",
					offeredAt: now,
					// min(now + 12h, startsAt)
					expiresAt: new Date("2026-01-02T00:00:00.000Z"),
				},
			],
		});
		expect(first[0]?.status).toBe("offered");
		expect(second[0]?.status).toBe("offered");
		expect(deleteAnswersMock).not.toHaveBeenCalled();
	});

	it("offers every freed seat in one batch when capacity grows", async () => {
		notifyOfferedMock.mockClear();

		const now = new Date("2026-01-01T12:00:00.000Z");
		const entries: ActiveEntry[] = [
			{
				id: "e1",
				participantId: "p1",
				status: "waiting",
				joinedAt: new Date("2026-01-01T10:00:00.000Z"),
				offerExpiresAt: null,
			},
			{
				id: "e2",
				participantId: "p2",
				status: "waiting",
				joinedAt: new Date("2026-01-01T10:05:00.000Z"),
				offerExpiresAt: null,
			},
		];
		const tx = makeTx({
			entries,
			enrolled: 0,
			startsAt: new Date("2026-01-02T12:00:00.000Z"),
			endsAt: new Date("2026-01-02T18:00:00.000Z"),
		});
		const locked = {
			id: "a1",
			projectId: "pr1",
			participantsLimit: 2,
			waitlistEnabled: true,
			waitlistOfferHours: 12,
			cancelledAt: null,
		};

		await settleActivity(tx, locked, now);

		expect(notifyOfferedMock).toHaveBeenCalledTimes(1);
		const offers = notifyOfferedMock.mock.calls[0]?.[0]?.offers;
		expect(offers).toHaveLength(2);
		expect(offers?.map((offer) => offer.participantId)).toEqual([
			"p1",
			"p2",
		]);
	});
});
