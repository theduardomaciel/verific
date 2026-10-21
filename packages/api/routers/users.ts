import "server-only";
// API
import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import { and, eq, ne } from "@verific/drizzle/orm";
import { user } from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import { userOwnedProjectIds, userProfileRefs } from "../lib/user-public-scope";
import { createTRPCRouter, protectedProcedure } from "../trpc";

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

			// UPDATE condicional atômico: nome igual não escreve nem invalida.
			const renamed = await db
				.update(user)
				.set({ name: input.name })
				.where(and(eq(user.id, userId), ne(user.name, input.name)))
				.returning({ id: user.id });
			const nameChanged = renamed.length > 0;

			if (!nameChanged) {
				return {
					success: true,
					nameChanged: false,
					profileRefs: [],
					ownedProjectIds: [],
				};
			}

			const [profileRefs, ownedProjectIds] = await Promise.all([
				userProfileRefs(userId),
				userOwnedProjectIds(userId),
			]);

			return {
				success: true,
				nameChanged: true,
				profileRefs,
				ownedProjectIds,
			};
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
