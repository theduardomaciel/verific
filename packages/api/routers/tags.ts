import { z } from "@verific/zod";

import { db } from "@verific/drizzle";
import { tag } from "@verific/drizzle/schema";
import { asc, eq } from "@verific/drizzle/orm";

// tRPC
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// Utils
import { isMemberAuthenticated } from "../auth";
import { tagColorSchema } from "../schemas";

export const tagsRouter = createTRPCRouter({
	getProjectTags: publicProcedure
		.input(z.object({ projectId: z.uuid() }))
		.query(async ({ input }) => {
			return db.query.tag.findMany({
				where: eq(tag.projectId, input.projectId),
				orderBy: asc(tag.name),
			});
		}),

	createTag: protectedProcedure
		.input(
			z.object({
				projectId: z.uuid(),
				name: z.string().trim().min(1).max(30),
				color: tagColorSchema,
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const error = await isMemberAuthenticated({
				userId: ctx.session.user.id,
			});
			if (error) throw new TRPCError(error);

			try {
				const created = await db
					.insert(tag)
					.values({
						projectId: input.projectId,
						name: input.name,
						color: input.color,
					})
					.returning();
				return created[0];
			} catch {
				throw new TRPCError({
					message: "Já existe uma trilha com esse nome.",
					code: "BAD_REQUEST",
				});
			}
		}),

	renameTag: protectedProcedure
		.input(
			z.object({
				tagId: z.uuid(),
				name: z.string().trim().min(1).max(30),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const error = await isMemberAuthenticated({
				userId: ctx.session.user.id,
			});
			if (error) throw new TRPCError(error);

			try {
				await db
					.update(tag)
					.set({ name: input.name })
					.where(eq(tag.id, input.tagId));
				return { success: true };
			} catch {
				throw new TRPCError({
					message: "Já existe uma trilha com esse nome.",
					code: "BAD_REQUEST",
				});
			}
		}),

	deleteTag: protectedProcedure
		.input(z.object({ tagId: z.uuid() }))
		.mutation(async ({ input, ctx }) => {
			const error = await isMemberAuthenticated({
				userId: ctx.session.user.id,
			});
			if (error) throw new TRPCError(error);

			// Links activity↔tag são removidos por cascade
			await db.delete(tag).where(eq(tag.id, input.tagId));
			return { success: true };
		}),
});
