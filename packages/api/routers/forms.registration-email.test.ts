import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

import type { SendNotificationInput } from "../notifications/types";

const PROJECT_ID = randomUUID();
const PARTICIPANT_ID = randomUUID();

const {
	dbMock,
	sendNotificationMock,
	findProject,
	findParticipant,
	findFormVersion,
	findUser,
	findSpeaker,
} = vi.hoisted(() => {
	const findProject = vi.fn();
	const findParticipant = vi.fn();
	const findFormVersion = vi.fn();
	const findUser = vi.fn();
	const findSpeaker = vi.fn();
	const sendNotification = vi.fn(async (_input: SendNotificationInput) => ({
		notification: null,
	}));
	const db = {
		query: {
			project: { findFirst: findProject },
			participant: { findFirst: findParticipant },
			formVersion: { findFirst: findFormVersion },
			user: { findFirst: findUser },
			speaker: { findFirst: findSpeaker },
		},
		update: () => ({ set: () => ({ where: async () => [] }) }),
		insert: () => ({
			values: () => ({
				returning: async () => [
					{ id: PARTICIPANT_ID, shortId: "abc123" },
				],
			}),
		}),
	};
	return {
		dbMock: db,
		sendNotificationMock: sendNotification,
		findProject,
		findParticipant,
		findFormVersion,
		findUser,
		findSpeaker,
	};
});

vi.mock("@verific/drizzle", () => ({ db: dbMock }));
vi.mock("@verific/env", () => ({
	env: { NEXT_PUBLIC_VERCEL_URL: "https://example.com" },
	appUrl: "https://example.com",
}));
vi.mock("../notifications", async (importOriginal) => ({
	...(await importOriginal<object>()),
	sendNotification: sendNotificationMock,
}));
vi.mock("../notifications/service", async (importOriginal) => ({
	...(await importOriginal<object>()),
	sendNotification: sendNotificationMock,
}));

import { createCallerFactory } from "../trpc";
import { formsRouter } from "./forms";

const createCaller = createCallerFactory(formsRouter);
const session = { user: { id: "user-1" } } as unknown as Session;

function projectRow() {
	return {
		id: PROJECT_ID,
		name: "Secomp UFAL 2026",
		url: "secomp-2026",
		address: "Campus A. C. Simões",
		startDate: new Date(Date.now() + 7 * 86_400_000),
		endDate: new Date(Date.now() + 8 * 86_400_000),
		isRegistrationEnabled: true,
		isArchived: false,
		logoUrl: null,
		largeLogoUrl: null,
	};
}

describe("submitAnswers registration email", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		findProject.mockResolvedValue(projectRow());
		findParticipant.mockResolvedValue(null);
		findFormVersion.mockResolvedValue(null);
		findUser.mockResolvedValue({ email: "  User@Example.com " });
		findSpeaker.mockResolvedValue(null);
	});

	it("calls sendNotification once with the expected key", async () => {
		const caller = createCaller({ session });

		const result = await caller.submitAnswers({
			projectId: PROJECT_ID,
			name: "Maria Silva",
			answers: {},
		});

		expect(result).toEqual({
			participantId: PARTICIPANT_ID,
			shortId: "abc123",
			claimedSpeakerActivityIds: [],
		});
		await vi.waitFor(() => {
			expect(sendNotificationMock).toHaveBeenCalledTimes(1);
		});
		expect(sendNotificationMock).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "event_registration_confirmation",
				idempotencyKey: `event_registration_confirmation:${PARTICIPANT_ID}`,
				to: "user@example.com",
				eventId: PROJECT_ID,
				entityRefs: { registrationId: PARTICIPANT_ID },
			}),
		);
		const input = sendNotificationMock.mock.calls[0]?.[0];
		// Display data is never part of the queued input; it is rebuilt from
		// the registration id at send time.
		expect(input).not.toHaveProperty("payload");
		expect(JSON.stringify(input)).not.toContain(
			"https://example.com/secomp-2026",
		);
	});

	it("still succeeds when the provider fails", async () => {
		sendNotificationMock.mockRejectedValueOnce(new Error("boom"));
		const caller = createCaller({ session });

		const result = await caller.submitAnswers({
			projectId: PROJECT_ID,
			name: "Maria Silva",
			answers: {},
		});

		expect(result.participantId).toBe(PARTICIPANT_ID);
		await vi.waitFor(() => {
			expect(sendNotificationMock).toHaveBeenCalledTimes(1);
		});
	});

	it("does not send on duplicate registration attempts", async () => {
		findParticipant.mockResolvedValue({ id: "existing" });
		const caller = createCaller({ session });

		await expect(
			caller.submitAnswers({
				projectId: PROJECT_ID,
				name: "Maria Silva",
				answers: {},
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(sendNotificationMock).not.toHaveBeenCalled();
	});
});
