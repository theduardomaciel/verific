import { describe, expect, it } from "vitest";

import type { Session } from "@verific/auth";

import {
	createCallerFactory,
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "./trpc";

const testRouter = createTRPCRouter({
	ping: publicProcedure.query(() => "pong"),
	whoami: protectedProcedure.query(({ ctx }) => ctx.session.user.id),
});

const createCaller = createCallerFactory(testRouter);

const session = {
	user: { id: "user-1" },
} as unknown as Session;

describe("tRPC procedures", () => {
	it("runs public procedures without a session", async () => {
		const caller = createCaller({ session: null });

		await expect(caller.ping()).resolves.toBe("pong");
	});

	it("rejects protected procedures without a session", async () => {
		const caller = createCaller({ session: null });

		await expect(caller.whoami()).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});

	it("runs protected procedures with a session", async () => {
		const caller = createCaller({ session });

		await expect(caller.whoami()).resolves.toBe("user-1");
	});
});
