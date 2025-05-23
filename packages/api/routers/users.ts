import { db } from "@verific/drizzle";

import { z } from "zod";

import { participant, user } from "@verific/drizzle/schema";
import { eq } from "@verific/drizzle/orm";

import { unstable_update } from "@verific/auth";

import { createTRPCRouter, protectedProcedure } from "../trpc";

// Enums
import { courses } from "@verific/drizzle/enum/course";
import { periods } from "@verific/drizzle/enum/period";

// API
import { TRPCError } from "@trpc/server";

export const usersRouter = createTRPCRouter({
	updateUser: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				course: z.enum(courses),
				registrationId: z.string(),
				period: z.enum(periods),
				projectId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session?.user.id;

			const { name, course, registrationId, period, projectId } = input;

			if (!userId) {
				throw new Error("User not found.");
			}

			// First we update the user
			await db
				.update(user)
				.set({
					name,
				})
				.where(eq(user.id, userId));

			// Then we create the participant
			const createdMember = await db
				.insert(participant)
				.values({
					userId,
					course,
					registrationId,
					period,
					projectId,
				})
				.returning(/* {
					id: participant.id,
					role: participant.role,
				} */);

			if (createdMember[0]) {
				await unstable_update({
					user: {
						...ctx.session.user,
						name,
					},
				});
			}
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
