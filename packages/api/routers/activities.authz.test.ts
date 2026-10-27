import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

const PROJECT_ID = randomUUID();
const ACTIVITY_ID = randomUUID();
const SELF_PARTICIPANT = randomUUID();
const OTHER_PARTICIPANT = randomUUID();

const {
	findProject,
	findActivity,
	findManyActivities,
	findParticipant,
	findManyFormVersions,
	selectMock,
	transactionMock,
	updateMock,
} = vi.hoisted(() => ({
	findProject: vi.fn(),
	findActivity: vi.fn(),
	findManyActivities: vi.fn(),
	findParticipant: vi.fn(),
	findManyFormVersions: vi.fn(async () => []),
	selectMock: vi.fn(),
	transactionMock: vi.fn(),
	updateMock: vi.fn(),
}));

vi.mock("@verific/drizzle", () => ({
	db: {
		query: {
			project: { findFirst: findProject },
			activity: { findFirst: findActivity, findMany: findManyActivities },
			participant: { findFirst: findParticipant },
			formVersion: { findMany: findManyFormVersions },
		},
		select: selectMock,
		transaction: transactionMock,
		update: updateMock,
	},
}));
vi.mock("@verific/env", () => ({ env: {} }));
vi.mock("./forms", () => ({ hasPublishedActivityForm: async () => false }));
vi.mock("../enrollment", () => ({
	assertNoScheduleConflict: vi.fn(),
	lockParticipant: vi.fn(),
	persistEnrollment: vi.fn(),
	prepareActivityAnswers: vi.fn(async () => []),
}));

import { createCallerFactory } from "../trpc";
import { activitiesRouter } from "./activities";

const createCaller = createCallerFactory(activitiesRouter);

/** Stub for drizzle's select-chain: a real promise carrying chain methods. */
function selectChain(result: unknown) {
	const c = Object.assign(Promise.resolve(result), {
		from: () => c,
		innerJoin: () => c,
		leftJoin: () => c,
		where: () => c,
		orderBy: () => c,
		limit: () => c,
		offset: () => c,
		groupBy: () => c,
	});
	return c;
}

const intruder = { user: { id: "intruder" } } as unknown as Session;

const sessions = [
	{
		startsAt: new Date("2026-11-10T10:00:00Z"),
		endsAt: new Date("2026-11-10T12:00:00Z"),
	},
];

describe("activities: só a organização do evento altera", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			ownerId: "owner",
			moderators: [],
		});
		findActivity.mockResolvedValue({
			id: ACTIVITY_ID,
			projectId: PROJECT_ID,
			address: null,
			isRegistrationOpen: true,
			sessions: [],
		});
		selectMock.mockReturnValue(selectChain([]));
	});

	const writes = [
		[
			"createActivity",
			(caller: ReturnType<typeof createCaller>) =>
				caller.createActivity({
					projectId: PROJECT_ID,
					name: "Oficina",
					sessions,
					category: "workshop",
					audience: "internal",
				}),
		],
		[
			"updateActivity",
			(caller: ReturnType<typeof createCaller>) =>
				caller.updateActivity({
					activityId: ACTIVITY_ID,
					name: "Outra",
				}),
		],
		[
			"updateActivityParticipants",
			(caller: ReturnType<typeof createCaller>) =>
				caller.updateActivityParticipants({
					activityId: ACTIVITY_ID,
					participantsIdsToMutate: [OTHER_PARTICIPANT],
				}),
		],
		[
			"addMonitorsToActivity",
			(caller: ReturnType<typeof createCaller>) =>
				caller.addMonitorsToActivity({
					activityId: ACTIVITY_ID,
					participantsIdsToAdd: [SELF_PARTICIPANT],
				}),
		],
		[
			"setActivitiesRegistration",
			(caller: ReturnType<typeof createCaller>) =>
				caller.setActivitiesRegistration({
					projectId: PROJECT_ID,
					activityIds: [ACTIVITY_ID],
					isRegistrationOpen: true,
				}),
		],
	] as const;

	it.each(writes)("%s recusa quem não é do evento", async (_name, call) => {
		const caller = createCaller({ session: intruder });

		await expect(call(caller)).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(transactionMock).not.toHaveBeenCalled();
		expect(updateMock).not.toHaveBeenCalled();
	});

	it("addActivityParticipants recusa inscrever outra pessoa", async () => {
		selectMock.mockReturnValue(
			selectChain([{ id: SELF_PARTICIPANT }, { id: OTHER_PARTICIPANT }]),
		);
		findParticipant.mockResolvedValue({ id: SELF_PARTICIPANT });
		const caller = createCaller({ session: intruder });

		await expect(
			caller.addActivityParticipants({
				activityId: ACTIVITY_ID,
				participantsIdsToAdd: [SELF_PARTICIPANT, OTHER_PARTICIPANT],
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(transactionMock).not.toHaveBeenCalled();
	});

	it("addActivityParticipants conta um id repetido uma vez só", async () => {
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			ownerId: "intruder",
			moderators: [],
		});
		selectMock.mockReturnValue(selectChain([{ id: SELF_PARTICIPANT }]));
		findParticipant.mockResolvedValue({ id: SELF_PARTICIPANT });
		transactionMock.mockRejectedValue(new Error("chegou à inscrição"));
		const caller = createCaller({ session: intruder });

		await expect(
			caller.addActivityParticipants({
				activityId: ACTIVITY_ID,
				participantsIdsToAdd: [SELF_PARTICIPANT, SELF_PARTICIPANT],
			}),
		).rejects.toThrow("chegou à inscrição");
	});

	it("aceita palestrante repetido uma vez só", () => {
		const parsed = activitiesRouter._def.procedures.createActivity._def
			.inputs[0] as {
			parse: (value: unknown) => { speakerIds?: number[] };
		};

		expect(
			parsed.parse({
				projectId: PROJECT_ID,
				name: "Oficina",
				sessions,
				category: "workshop",
				audience: "internal",
				speakerIds: [5, 5],
			}).speakerIds,
		).toEqual([5]);
	});

	it.each([{ tolerance: 2.5 }, { tolerance: -1 }, { workload: -2 }])(
		"recusa %o antes do banco",
		(extra) => {
			const parsed = activitiesRouter._def.procedures.createActivity._def
				.inputs[0] as unknown as {
				safeParse: (value: unknown) => { success: boolean };
			};

			expect(
				parsed.safeParse({
					projectId: PROJECT_ID,
					name: "Oficina",
					sessions,
					category: "workshop",
					audience: "internal",
					...extra,
				}).success,
			).toBe(false);
		},
	);

	it("addActivityParticipants não revela quem é do evento", async () => {
		selectMock.mockReturnValue(selectChain([]));
		const caller = createCaller({ session: intruder });

		await expect(
			caller.addActivityParticipants({
				activityId: ACTIVITY_ID,
				participantsIdsToAdd: [OTHER_PARTICIPANT],
			}),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "Sem permissão neste evento.",
		});
		expect(selectMock).not.toHaveBeenCalled();
		expect(transactionMock).not.toHaveBeenCalled();
	});

	it("addActivityParticipants recusa participante de outro evento", async () => {
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			ownerId: "intruder",
			moderators: [],
		});
		selectMock.mockReturnValue(selectChain([]));
		const caller = createCaller({ session: intruder });

		await expect(
			caller.addActivityParticipants({
				activityId: ACTIVITY_ID,
				participantsIdsToAdd: [OTHER_PARTICIPANT],
			}),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "Participants must belong to the activity project.",
		});
		expect(transactionMock).not.toHaveBeenCalled();
	});

	it("getReleasableActivities recusa quem não é do evento", async () => {
		const caller = createCaller({ session: intruder });

		await expect(
			caller.getReleasableActivities({ projectId: PROJECT_ID }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(findManyActivities).not.toHaveBeenCalled();
	});
});

describe("activities: estatísticas são da organização", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			ownerId: "owner",
			moderators: [],
		});
	});

	const stats = [
		[
			"getDashboardStats",
			(caller: ReturnType<typeof createCaller>) =>
				caller.getDashboardStats({ projectId: PROJECT_ID }),
		],
		[
			"getBreakdownFields",
			(caller: ReturnType<typeof createCaller>) =>
				caller.getBreakdownFields({ projectId: PROJECT_ID }),
		],
		[
			"getBreakdownSeries",
			(caller: ReturnType<typeof createCaller>) =>
				caller.getBreakdownSeries({ projectId: PROJECT_ID }),
		],
	] as const;

	it.each(stats)("%s exige login", async (_name, call) => {
		await expect(
			call(createCaller({ session: null })),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	it.each(stats)("%s recusa quem não é do evento", async (_name, call) => {
		await expect(
			call(createCaller({ session: intruder })),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(selectMock).not.toHaveBeenCalled();
	});
});

describe("activities: respostas sem dados pessoais", () => {
	const speakerRow = {
		id: 1,
		name: "Ana",
		email: "ana@example.com",
		linkedParticipant: null,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			ownerId: "owner",
			moderators: [],
		});
		selectMock.mockReturnValue(selectChain([]));
	});

	it("getActivities com fullQuery exige acesso ao evento", async () => {
		await expect(
			createCaller({ session: null }).getActivities({
				projectId: PROJECT_ID,
				fullQuery: true,
			}),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(
			createCaller({ session: intruder }).getActivities({
				projectId: PROJECT_ID,
				fullQuery: true,
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(findManyActivities).not.toHaveBeenCalled();
	});

	it("getActivities público não devolve e-mails", async () => {
		findManyActivities.mockResolvedValue([
			{
				id: ACTIVITY_ID,
				projectId: PROJECT_ID,
				participantsLimit: null,
				speakerOnActivity: [{ speakerId: 1, speaker: speakerRow }],
				tagOnActivity: [],
				sessions: [],
			},
		]);

		const result = await createCaller({ session: null }).getActivities({
			projectId: PROJECT_ID,
		});

		expect(JSON.stringify(result)).not.toContain("ana@example.com");
		expect(result.activities[0]).not.toHaveProperty(
			"participantOnActivity",
		);
	});

	it("getActivity para logado sem acesso devolve o formato público", async () => {
		findActivity.mockResolvedValue({
			id: ACTIVITY_ID,
			projectId: PROJECT_ID,
			participantsLimit: null,
			project: { startDate: new Date(), endDate: new Date() },
			sessions: [],
			speakerOnActivity: [{ speakerId: 1, speaker: speakerRow }],
			tagOnActivity: [],
		});

		const result = await createCaller({ session: intruder }).getActivity({
			activityId: ACTIVITY_ID,
		});

		expect(result.activity.participants).toEqual([]);
		expect(JSON.stringify(result)).not.toContain("ana@example.com");
	});
});
