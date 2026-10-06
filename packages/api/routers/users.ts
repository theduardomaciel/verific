import "server-only";

import { db } from "@verific/drizzle";

import { z } from "@verific/zod";

import { user } from "@verific/drizzle/schema";
import { eq } from "@verific/drizzle/orm";

import { createTRPCRouter, protectedProcedure } from "../trpc";

// API
import { TRPCError } from "@trpc/server";

export const usersRouter = createTRPCRouter({
	updateUser: protectedProcedure
		.input(
			z.object({
				name: z.string().min(2),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session?.user.id;

			if (!userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not found.",
				});
			}

			await db.update(user).set({ name: input.name }).where(eq(user.id, userId));

			return { success: true };
		}),
	getUser: protectedProcedure.query(async ({ ctx }) => {
		const { id } = ctx.session.user;

		if (!id) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not found.",
			});
		}

		const userData = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.id, id),
		});

		if (!userData) {
			throw new Error("User not found.");
		}

		return userData;
	}),
});
