import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { select, queue } = vi.hoisted(() => {
	const queue: unknown[][] = [];
	const select = vi.fn(() => {
		const rows = queue.shift() ?? [];
		// A primeira consulta (atividades válidas) é awaited direto; as duas
		// de contagem encadeiam `.groupBy(...)`.
		const whereResult = Object.assign(Promise.resolve(rows), {
			groupBy: async () => rows,
		});
		return { from: () => ({ where: () => whereResult }) };
	});
	return { select, queue };
});

vi.mock("@verific/drizzle", () => ({ db: { select } }));

import { createCallerFactory } from "../trpc";
import { availabilityRouter } from "./availability";

const createCaller = createCallerFactory(availabilityRouter);

describe("getActivityAvailability", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		queue.length = 0;
	});

	it("soma inscritos + ofertas e dá à fila a vaga livre", async () => {
		const projectId = randomUUID();
		const activityA = randomUUID();
		const activityB = randomUUID();
		const missing = randomUUID();

		queue.push([
			{ id: activityA, participantsLimit: null },
			{ id: activityB, participantsLimit: 10 },
		]);
		queue.push([
			{ activityId: activityA, amount: 3 },
			{ activityId: activityB, amount: 9 },
		]);
		queue.push([
			{ activityId: activityA, status: "offered", amount: 2 },
			{ activityId: activityB, status: "waiting", amount: 4 },
		]);

		const result = await createCaller({
			session: null,
		}).getActivityAvailability({
			projectId,
			activityIds: [activityA, activityB, missing],
		});

		expect(result).toEqual([
			{
				activityId: activityA,
				participantsCount: 5,
				waitlistCount: 0,
			},
			{
				activityId: activityB,
				participantsCount: 10,
				waitlistCount: 4,
			},
		]);
	});

	it("ignora atividade de outro projeto", async () => {
		const projectId = randomUUID();
		const activityId = randomUUID();

		queue.push([]);
		queue.push([]);
		queue.push([]);

		const result = await createCaller({
			session: null,
		}).getActivityAvailability({
			projectId,
			activityIds: [activityId],
		});

		expect(result).toEqual([]);
	});
});
