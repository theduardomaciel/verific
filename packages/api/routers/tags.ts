import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import { asc, eq } from "@verific/drizzle/orm";
import { tag } from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import { requireProjectAccess } from "../lib/project-access";
import { tagColorSchema } from "../schemas";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

async function requireTagAccess(tagId: string, userId: string) {
	const found = await db.query.tag.findFirst({
		where: eq(tag.id, tagId),
		columns: { projectId: true },
	});
	if (!found) {
		throw new TRPCError({
			message: "Trilha não encontrada.",
			code: "NOT_FOUND",
		});
	}
	await requireProjectAccess(found.projectId, userId);
}

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
			await requireProjectAccess(input.projectId, ctx.session.user.id);

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
			await requireTagAccess(input.tagId, ctx.session.user.id);

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
			await requireTagAccess(input.tagId, ctx.session.user.id);

			// Links activity↔tag são removidos por cascade
			await db.delete(tag).where(eq(tag.id, input.tagId));
			return { success: true };
		}),
});
