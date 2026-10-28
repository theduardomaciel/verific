import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

const PROJECT_ID = randomUUID();
const ACTIVITY_ID = randomUUID();
const PARTICIPANT_ID = randomUUID();

const { findActivity, findParticipant, deleted, notifyCancelled } = vi.hoisted(
	() => ({
		findActivity: vi.fn(),
		findParticipant: vi.fn(),
		deleted: { rows: [] as unknown[] },
		notifyCancelled: vi.fn(),
	}),
);

const tx = {
	delete: () => ({
		where: () => ({ returning: async () => deleted.rows }),
	}),
	select: () => ({
		from: () => ({
			where: async () => [],
			innerJoin: () => ({ where: async () => [] }),
		}),
	}),
	insert: () => ({ values: async () => {} }),
	transaction: async () => undefined,
};

vi.mock("@verific/drizzle", () => ({
	db: {
		query: {
			activity: { findFirst: findActivity },
			participant: { findFirst: findParticipant },
		},
		transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
	},
}));
vi.mock("@verific/env", () => ({ env: {} }));
vi.mock("../seats", () => ({ lockActivity: async () => ({}) }));
vi.mock("../waitlist", () => ({ settleActivity: async () => undefined }));
vi.mock("../enrollment", () => ({ deleteActivityAnswers: async () => {} }));
vi.mock("../notifications", () => ({
	loadNotificationRecipients: async () =>
		new Map([[PARTICIPANT_ID, "ana@example.com"]]),
	notifyActivityEnrollmentCancelled: notifyCancelled,
	notifyActivityEnrollmentRemoved: vi.fn(),
}));

import { createCallerFactory } from "../trpc";
import { participantOnActivitiesRouter } from "./participantOnActivities";

const session = { user: { id: "user-1" } } as unknown as Session;
const caller = createCallerFactory(participantOnActivitiesRouter)({
	session,
});
const input = {
	projectUrl: "evento",
	activityId: ACTIVITY_ID,
	participantId: PARTICIPANT_ID,
};

beforeEach(() => {
	vi.clearAllMocks();
	findActivity.mockResolvedValue({
		project: {
			id: PROJECT_ID,
			url: "evento",
			ownerId: "owner",
			moderators: [],
		},
	});
	findParticipant.mockResolvedValue({ userId: "user-1" });
});

describe("deleteParticipantFromActivity", () => {
	it("avisa quem cancelou a inscrição", async () => {
		deleted.rows = [{ role: "participant" }];

		await caller.deleteParticipantFromActivity(input);

		expect(notifyCancelled).toHaveBeenCalledOnce();
	});

	it("não avisa de novo quando a inscrição já tinha saído", async () => {
		deleted.rows = [];

		await expect(
			caller.deleteParticipantFromActivity(input),
		).resolves.toEqual({ success: true });
		expect(notifyCancelled).not.toHaveBeenCalled();
	});
});
