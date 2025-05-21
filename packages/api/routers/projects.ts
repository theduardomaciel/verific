import { db } from "@verific/drizzle";

import { z } from "zod";

import { project } from "@verific/drizzle/schema";
import { eq } from "@verific/drizzle/orm";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const projectsRouter = createTRPCRouter({
	createProject: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				description: z.string().optional().nullable(),
				address: z.string(),
				coverUrl: z.string().optional().nullable(),
				thumbnailUrl: z.string().optional().nullable(),
				startDate: z.coerce.date(),
				endDate: z.coerce.date(),
			}),
		)
		.mutation(async ({ input }) => {
			const {
				name,
				description,
				address,
				coverUrl,
				thumbnailUrl,
				startDate,
				endDate,
			} = input;

			const url = name.toLowerCase().replace(/\s+/g, "-");

			const created = await db
				.insert(project)
				.values({
					name,
					description,
					url,
					address,
					coverUrl,
					thumbnailUrl,
					startDate,
					endDate,
				})
				.returning({ id: project.id });
			return { id: created[0]?.id };
		}),

	updateProject: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				name: z.string(),
				description: z.string(),
				url: z.string(),
				address: z.string(),
				hasRegistration: z.boolean().optional(),
				hasResearch: z.boolean().optional(),
				isArchived: z.boolean().optional(),
				coverUrl: z.string(),
				thumbnailUrl: z.string(),
				primaryColor: z.string(),
				secondaryColor: z.string(),
				startDate: z.coerce.date(),
				endDate: z.coerce.date(),
			}),
		)
		.mutation(async ({ input }) => {
			const {
				id,
				name,
				description,
				url,
				address,
				hasRegistration = false,
				hasResearch = false,
				isArchived = false,
				coverUrl,
				thumbnailUrl,
				primaryColor,
				secondaryColor,
				startDate,
				endDate,
			} = input;

			await db
				.update(project)
				.set({
					name,
					description,
					url,
					address,
					hasRegistration,
					hasResearch,
					isArchived,
					coverUrl,
					thumbnailUrl,
					primaryColor,
					secondaryColor,
					startDate,
					endDate,
				})
				.where(eq(project.id, id));
			return { updated: true };
		}),

	getProject: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ input }) => {
			const projectData = await db.query.project.findFirst({
				where: eq(project.id, input.id),
			});
			if (!projectData) {
				throw new Error("Project not found");
			}
			return projectData;
		}),

	getProjects: protectedProcedure.query(async () => {
		return db.query.project.findMany();
	}),

	deleteProject: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			await db.delete(project).where(eq(project.id, input.id));
			return { success: true };
		}),
});
