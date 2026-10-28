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

const { notifyOfferedMock, notifyRevokedMock, deleteAnswersMock } = vi.hoisted(
	() => ({
		notifyOfferedMock: vi.fn<(args: OfferedArgs) => Promise<void>>(
			async () => {},
		),
		notifyRevokedMock: vi.fn(async () => {}),
		deleteAnswersMock: vi.fn(async () => {}),
	}),
);

vi.mock("./notifications", () => ({
	notifyActivityWaitlistOffered: notifyOfferedMock,
	notifyActivityWaitlistOfferRevoked: notifyRevokedMock,
}));
vi.mock("./enrollment", () => ({
	deleteActivityAnswers: deleteAnswersMock,
}));

import {
	activity,
	activitySession,
	activityWaitlist,
	activityWaitlistEvent,
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
	inserted?: unknown[];
}) {
	const { entries, enrolled, startsAt, endsAt, inserted = [] } = args;
	const promiseFor = (table: unknown) => {
		const result =
			table === activityWaitlist
				? entries
				: table === activitySession
					? [{ startsAt, endsAt }]
					: table === participantOnActivity
						? [{ amount: enrolled }]
						: table === activity
							? [{ projectId: "pr1" }]
							: [];
		const promise = Promise.resolve(result);
		(promise as unknown as { orderBy: () => unknown }).orderBy = () =>
			promise;
		return promise;
	};
	return {
		select: () => ({
			from: (table: unknown) => ({
				where: () => promiseFor(table),
				// `recordParticipantEvents` resolve nomes com um join.
				innerJoin: () => ({ where: () => promiseFor(table) }),
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
		insert: (table: unknown) => ({
			values: async (rows: unknown[]) => {
				// Só a tabela da fila é observada pelos testes.
				if (table === activityWaitlistEvent) inserted.push(...rows);
			},
		}),
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
			waitlistOfferMinutes: null,
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
			waitlistOfferMinutes: null,
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

describe("settleActivity with a lowered limit", () => {
	it("returns the last open offer to the queue, records it and warns the person", async () => {
		const now = new Date("2026-01-01T12:00:00.000Z");
		const offer = (id: string, joinedAt: string): ActiveEntry => ({
			id,
			participantId: `p-${id}`,
			status: "offered",
			joinedAt: new Date(joinedAt),
			offerExpiresAt: new Date("2026-01-01T20:00:00.000Z"),
		});
		const inserted: unknown[] = [];
		const tx = makeTx({
			entries: [
				offer("e1", "2026-01-01T09:00:00.000Z"),
				offer("e2", "2026-01-01T10:00:00.000Z"),
			],
			enrolled: 0,
			startsAt: new Date("2026-01-02T12:00:00.000Z"),
			endsAt: new Date("2026-01-02T18:00:00.000Z"),
			inserted,
		});

		const queue = await settleActivity(
			tx,
			{
				id: "a1",
				projectId: "pr1",
				participantsLimit: 1,
				waitlistEnabled: true,
				waitlistOfferHours: 12,
				waitlistOfferMinutes: null,
				cancelledAt: null,
			},
			now,
		);

		expect(queue.find((entry) => entry.id === "e2")?.status).toBe(
			"waiting",
		);
		expect(inserted).toEqual([
			expect.objectContaining({ participantId: "p-e2", type: "revoked" }),
		]);
		expect(notifyRevokedMock).toHaveBeenCalledWith({
			eventId: "pr1",
			activityId: "a1",
			revoked: [{ participantId: "p-e2", enrollmentId: "e2" }],
			revokedAt: now,
		});
	});
});
