import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

import {
	__unregisterCacheRevalidator,
	registerCacheRevalidator,
} from "../cache-invalidation";

import type { SendNotificationInput } from "../notifications/types";

const PROJECT_ID = randomUUID();
const PARTICIPANT_ID = randomUUID();

const {
	dbMock,
	sendNotificationMock,
	findProject,
	findProjectMany,
	findParticipant,
	findParticipantMany,
	findFormVersion,
	findUser,
	findSpeaker,
	updateReturning,
} = vi.hoisted(() => {
	const findProject = vi.fn();
	const findProjectMany = vi.fn();
	const findParticipant = vi.fn();
	const findParticipantMany = vi.fn();
	const findFormVersion = vi.fn();
	const findUser = vi.fn();
	const findSpeaker = vi.fn();
	const updateReturning = vi.fn();
	const sendNotification = vi.fn(async (_input: SendNotificationInput) => ({
		notification: null,
	}));
	const db = {
		query: {
			project: { findFirst: findProject, findMany: findProjectMany },
			participant: {
				findFirst: findParticipant,
				findMany: findParticipantMany,
			},
			formVersion: { findFirst: findFormVersion },
			user: { findFirst: findUser },
			speaker: { findFirst: findSpeaker },
		},
		update: () => ({
			set: () => ({
				where: () => ({ returning: updateReturning }),
			}),
		}),
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
		findProjectMany,
		findParticipant,
		findParticipantMany,
		findFormVersion,
		findUser,
		findSpeaker,
		updateReturning,
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
		findProjectMany.mockResolvedValue([]);
		findParticipant.mockResolvedValue(null);
		findParticipantMany.mockResolvedValue([]);
		findFormVersion.mockResolvedValue(null);
		findUser.mockResolvedValue({ email: "  User@Example.com " });
		findSpeaker.mockResolvedValue(null);
		updateReturning.mockResolvedValue([]);
	});

	afterEach(() => {
		__unregisterCacheRevalidator();
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
			nameChanged: false,
			profileRefs: [],
			ownedProjectIds: [],
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

	it("invalida só o ranking quando o nome não mudou", async () => {
		const seen: string[] = [];
		registerCacheRevalidator((tag) => seen.push(tag));
		const caller = createCaller({ session });

		await caller.submitAnswers({
			projectId: PROJECT_ID,
			name: "Maria Silva",
			answers: {},
		});

		expect(updateReturning).toHaveBeenCalledTimes(1);
		expect(findParticipantMany).not.toHaveBeenCalled();
		expect(findProjectMany).not.toHaveBeenCalled();
		// A inscrição concede pontos de boas-vindas: o ranking muda mesmo
		// sem alteração de nome.
		expect(seen).toEqual([`project-gamification:${PROJECT_ID}`]);
	});

	it("invalida só os perfis do usuário quando o nome mudou", async () => {
		updateReturning.mockResolvedValueOnce([{ id: "user-1" }]);
		findParticipantMany.mockResolvedValueOnce([
			{ projectId: PROJECT_ID, shortId: "abc123" },
			{ projectId: "project-2", shortId: "xyz789" },
		]);
		const seen: string[] = [];
		registerCacheRevalidator((tag) => seen.push(tag));
		const caller = createCaller({ session });

		await caller.submitAnswers({
			projectId: PROJECT_ID,
			name: "Maria Silva",
			answers: {},
		});

		expect(seen).toEqual([
			`participant-profile:${PROJECT_ID}:abc123`,
			"participant-profile:project-2:xyz789",
			`project-gamification:${PROJECT_ID}`,
		]);
		expect(seen).not.toContain("profiles");
		expect(seen).not.toContain("events");
	});

	it("também invalida a landing quando o inscrito é dono do evento", async () => {
		updateReturning.mockResolvedValueOnce([{ id: "user-1" }]);
		findProjectMany.mockResolvedValueOnce([{ id: "owned-project" }]);
		const seen: string[] = [];
		registerCacheRevalidator((tag) => seen.push(tag));
		const caller = createCaller({ session });

		await caller.submitAnswers({
			projectId: PROJECT_ID,
			name: "Maria Silva",
			answers: {},
		});

		expect(seen).toContain("project:owned-project");
	});
});
