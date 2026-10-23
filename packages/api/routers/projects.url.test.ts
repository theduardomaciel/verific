import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

const PROJECT_ID = randomUUID();

const { findProject, selectMock, insertedUrls, insertMock, updateMock } =
	vi.hoisted(() => {
		const insertedUrls: string[] = [];
		return {
			findProject: vi.fn(),
			selectMock: vi.fn(),
			insertedUrls,
			insertMock: vi.fn(() => ({
				values: (row: { url?: string }) => {
					if (row.url) insertedUrls.push(row.url);
					const result = Promise.resolve(undefined);
					return Object.assign(result, {
						returning: async () => [{ id: "new-id", url: row.url }],
					});
				},
			})),
			updateMock: vi.fn(),
		};
	});

vi.mock("@verific/drizzle", () => ({
	db: {
		query: { project: { findFirst: findProject } },
		select: selectMock,
		insert: insertMock,
		update: updateMock,
	},
}));
vi.mock("@verific/env", () => ({ env: {} }));

import { createCallerFactory } from "../trpc";
import { projectsRouter } from "./projects";

const createCaller = createCallerFactory(projectsRouter);
const owner = { user: { id: "owner" } } as unknown as Session;

function selectChain(result: unknown) {
	const c = Object.assign(Promise.resolve(result), {
		from: () => c,
		where: () => c,
	});
	return c;
}

function uniqueViolation() {
	return new Error("Failed query", { cause: { code: "23505" } });
}

const newProject = {
	name: "Semana de Computação",
	address: "Campus",
	latitude: 0,
	longitude: 0,
	startDate: new Date("2026-11-10"),
	endDate: new Date("2026-11-12"),
};

describe("URL do evento", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		insertedUrls.length = 0;
	});

	it("cria com o slug do nome", async () => {
		selectMock.mockReturnValue(selectChain([]));

		const result = await createCaller({ session: owner }).createProject(
			newProject,
		);

		expect(result.url).toBe("semana-de-computacao");
	});

	it("usa o primeiro sufixo livre quando o nome já existe", async () => {
		selectMock.mockReturnValue(
			selectChain([
				{ url: "semana-de-computacao" },
				{ url: "semana-de-computacao-2" },
			]),
		);

		const result = await createCaller({ session: owner }).createProject(
			newProject,
		);

		expect(result.url).toBe("semana-de-computacao-3");
	});

	it("não usa a URL de uma rota do app", async () => {
		selectMock.mockReturnValue(selectChain([]));

		const result = await createCaller({ session: owner }).createProject({
			...newProject,
			name: "Dashboard",
		});

		expect(result.url).toBe("dashboard-2");
	});

	it("na edição, recusa a URL de uma rota do app", async () => {
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			url: "meu-evento",
			ownerId: "owner",
			moderators: [],
		});

		await expect(
			createCaller({ session: owner }).updateProject({
				id: PROJECT_ID,
				url: "Dashboard",
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(updateMock).not.toHaveBeenCalled();
	});

	it("na edição, URL de outro evento dá CONFLICT", async () => {
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			url: "meu-evento",
			ownerId: "owner",
			moderators: [],
		});
		updateMock.mockImplementation(() => ({
			set: () => ({
				where: async () => {
					throw uniqueViolation();
				},
			}),
		}));

		await expect(
			createCaller({ session: owner }).updateProject({
				id: PROJECT_ID,
				url: "Evento Alheio",
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	it("na edição, normaliza só uma URL nova", async () => {
		findProject.mockResolvedValue({
			id: PROJECT_ID,
			url: "computação",
			ownerId: "owner",
			moderators: [],
		});
		const setMock = vi.fn(() => ({ where: async () => [] }));
		updateMock.mockImplementation(() => ({ set: setMock }));
		const caller = createCaller({ session: owner });

		await caller.updateProject({ id: PROJECT_ID, url: "computação" });
		await caller.updateProject({ id: PROJECT_ID, url: "Nova URL!" });

		expect(setMock).toHaveBeenNthCalledWith(1, { url: "computação" });
		expect(setMock).toHaveBeenNthCalledWith(2, { url: "nova-url" });
	});
});
