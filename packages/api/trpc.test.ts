import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";
import { DrizzleQueryError } from "@verific/drizzle/orm";

import { mutationCacheRules } from "./cache-invalidation";
import {
	createCallerFactory,
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "./trpc";

const testRouter = createTRPCRouter({
	ping: publicProcedure.query(() => "pong"),
	whoami: protectedProcedure.query(({ ctx }) => ctx.session.user.id),
	secureWrite: protectedProcedure.mutation(() => "ok"),
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

describe("protectedProcedure e o cache", () => {
	it("recusa a chamada anônima antes do snapshot", async () => {
		const snapshot = vi.fn();
		mutationCacheRules.secureWrite = { snapshot, tags: () => [] };
		try {
			const caller = createCaller({ session: null });

			await expect(caller.secureWrite()).rejects.toMatchObject({
				code: "UNAUTHORIZED",
			});
			expect(snapshot).not.toHaveBeenCalled();
		} finally {
			delete mutationCacheRules.secureWrite;
		}
	});
});

describe("errorFormatter", () => {
	const format = (error: TRPCError) =>
		testRouter._def._config.errorFormatter({
			error,
			shape: {
				message: error.message,
				code: -32603,
				data: { code: error.code, httpStatus: 500 },
			},
			type: "query",
			path: "ping",
			input: undefined,
			ctx: undefined,
		});

	it("esconde a mensagem de um erro de query", () => {
		const cause = new DrizzleQueryError(
			'select * from "users" where "email" = $1',
			["ana@example.com"],
			new Error("timeout"),
		);
		const error = new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause });

		expect(format(error).message).toBe("Erro interno do servidor.");
	});

	it("mantém a mensagem de outras exceções", () => {
		const cause = new Error("Arquivo excede o tamanho máximo permitido.");
		const error = new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause });

		expect(format(error).message).toBe(
			"Arquivo excede o tamanho máximo permitido.",
		);
	});

	it("mantém a mensagem de um TRPCError lançado de propósito", () => {
		const error = new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Falha ao criar a atividade.",
			cause: { code: "X" },
		});

		expect(format(error).message).toBe("Falha ao criar a atividade.");
	});
});
