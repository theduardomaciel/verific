import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

import type * as StorageModule from "../lib/storage";

const PROJECT_ID = randomUUID();
const OTHER_PROJECT_ID = randomUUID();
const TAG_ID = randomUUID();
const PARTICIPANT_ID = randomUUID();

const {
	findProject,
	findTag,
	findSpeaker,
	findActivity,
	findParticipant,
	insertMock,
	updateMock,
	deleteMock,
	deleteObject,
} = vi.hoisted(() => ({
	findProject: vi.fn(),
	findTag: vi.fn(),
	findSpeaker: vi.fn(),
	findActivity: vi.fn(),
	findParticipant: vi.fn(),
	insertMock: vi.fn(),
	updateMock: vi.fn(),
	deleteMock: vi.fn(() => ({ where: async () => [] })),
	deleteObject: vi.fn(async () => undefined),
}));

vi.mock("@verific/drizzle", () => ({
	db: {
		query: {
			project: { findFirst: findProject },
			tag: { findFirst: findTag },
			speaker: { findFirst: findSpeaker },
			activity: { findFirst: findActivity },
			participant: { findFirst: findParticipant },
		},
		insert: insertMock,
		update: updateMock,
		delete: deleteMock,
	},
}));
vi.mock("@verific/env", () => ({ env: {} }));
vi.mock("../lib/storage", async (importOriginal) => {
	const original = await importOriginal<typeof StorageModule>();
	return {
		...original,
		storage: { ...original.storage, deleteObject },
	};
});
// Sem resposta para esperar: a exclusão roda já
vi.mock("../lib/after-response", () => ({
	scheduleAfterResponse: (work: () => Promise<void>) => work(),
}));

import { deleteReplacedImages } from "../lib/image-cleanup";
import { createCallerFactory } from "../trpc";
import { participantsRouter } from "./participants";
import { speakersRouter } from "./speakers";
import { tagsRouter } from "./tags";

const intruder = { user: { id: "intruder" } } as unknown as Session;
const owner = { user: { id: "owner" } } as unknown as Session;

beforeEach(() => {
	vi.clearAllMocks();
	findProject.mockResolvedValue({
		id: PROJECT_ID,
		ownerId: "owner",
		moderators: [],
	});
});

describe("tags", () => {
	const createCaller = createCallerFactory(tagsRouter);

	it("createTag recusa quem não é do evento", async () => {
		await expect(
			createCaller({ session: intruder }).createTag({
				projectId: PROJECT_ID,
				name: "Trilha",
				color: "#ef4444",
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(insertMock).not.toHaveBeenCalled();
	});

	it("renameTag e deleteTag recusam trilha de outro evento", async () => {
		findTag.mockResolvedValue({ projectId: PROJECT_ID });
		const caller = createCaller({ session: intruder });

		await expect(
			caller.renameTag({ tagId: TAG_ID, name: "Outra" }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(caller.deleteTag({ tagId: TAG_ID })).rejects.toMatchObject(
			{
				code: "FORBIDDEN",
			},
		);
		expect(updateMock).not.toHaveBeenCalled();
		expect(deleteMock).not.toHaveBeenCalled();
	});
});

describe("speakers", () => {
	const createCaller = createCallerFactory(speakersRouter);

	it("updateSpeaker não move palestrante de outro evento", async () => {
		findSpeaker.mockResolvedValue({
			id: 7,
			projectId: OTHER_PROJECT_ID,
			email: null,
			participantId: null,
		});

		await expect(
			createCaller({ session: owner }).updateSpeaker({
				id: 7,
				name: "Ana",
				description: "",
				imageUrl: "",
				projectId: PROJECT_ID,
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(updateMock).not.toHaveBeenCalled();
	});
});

describe("imagem substituída", () => {
	it("updateSpeaker apaga a foto antiga depois de salvar a nova", async () => {
		const oldKey = `speaker/${PROJECT_ID}/antiga.webp`;
		findSpeaker.mockResolvedValue({
			id: 7,
			projectId: PROJECT_ID,
			imageUrl: oldKey,
			email: null,
			participantId: null,
		});
		const where = vi.fn(async () => []);
		updateMock.mockReturnValue({ set: () => ({ where }) });

		await createCallerFactory(speakersRouter)({
			session: owner,
		}).updateSpeaker({
			id: 7,
			name: "Ana",
			description: "",
			imageUrl: `speaker/${PROJECT_ID}/nova.webp`,
			projectId: PROJECT_ID,
		});

		await vi.waitFor(() =>
			expect(deleteObject).toHaveBeenCalledWith(oldKey),
		);
		expect(where.mock.invocationCallOrder[0]).toBeLessThan(
			deleteObject.mock.invocationCallOrder[0]!,
		);
	});
});

describe("deleteReplacedImages", () => {
	it("apaga só as imagens do próprio evento que saíram de uso", async () => {
		findSpeaker.mockResolvedValue({ projectId: OTHER_PROJECT_ID });
		findActivity.mockResolvedValue({ projectId: OTHER_PROJECT_ID });
		const own = `event-logo/${PROJECT_ID}/a.webp`;

		await deleteReplacedImages(
			PROJECT_ID,
			[
				own,
				`event-logo/${PROJECT_ID}/mantida.webp`,
				`event-logo/${OTHER_PROJECT_ID}/a.webp`,
				`event-logo/${PROJECT_ID}/../${OTHER_PROJECT_ID}/a.webp`,
				`outra-coisa/${PROJECT_ID}/a.webp`,
				`toString/${PROJECT_ID}/a.webp`,
				`migrated/projects/${OTHER_PROJECT_ID}/logo_url.webp`,
				"migrated/speakers/7/image_url.webp",
				`migrated/activities/${randomUUID()}/banner_url.webp`,
				"migrated/activities/nao-e-uuid/banner_url.webp",
				null,
			],
			[`event-logo/${PROJECT_ID}/mantida.webp`],
		);

		expect(deleteObject.mock.calls).toEqual([[own]]);
	});

	it("aceita imagem migrada do próprio evento", async () => {
		findSpeaker.mockResolvedValue({ projectId: PROJECT_ID });
		const keys = [
			`migrated/projects/${PROJECT_ID}/logo_url.webp`,
			"migrated/speakers/7/image_url.webp",
		];

		await deleteReplacedImages(PROJECT_ID, keys, []);

		expect(deleteObject.mock.calls).toEqual(keys.map((key) => [key]));
	});
});

describe("getParticipant", () => {
	const createCaller = createCallerFactory(participantsRouter);

	function participantRow() {
		return {
			id: PARTICIPANT_ID,
			userId: "member",
			user: { name: "Bia", email: "bia@example.com", image_url: null },
			participantOnActivity: [],
			project: {
				id: PROJECT_ID,
				ownerId: "owner",
				profilesEnabled: true,
				moderators: [],
			},
		};
	}

	it("com perfis públicos, terceiros não recebem o e-mail", async () => {
		findParticipant.mockResolvedValue(participantRow());

		const result = await createCaller({ session: intruder }).getParticipant(
			{
				participantId: PARTICIPANT_ID,
			},
		);

		expect(result.participant.user.email).toBeNull();
		expect(result.participant).not.toHaveProperty("participantOnActivity");
		expect(result.participant.project).not.toHaveProperty("moderators");
	});

	it("a organização e o próprio participante recebem o e-mail", async () => {
		for (const id of ["owner", "member"]) {
			findParticipant.mockResolvedValue(participantRow());
			const session = { user: { id } } as unknown as Session;

			const result = await createCaller({ session }).getParticipant({
				participantId: PARTICIPANT_ID,
			});

			expect(result.participant.user.email).toBe("bia@example.com");
		}
	});
});
