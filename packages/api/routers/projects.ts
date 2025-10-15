import { db } from "@verific/drizzle";

import { z } from "zod";

import { participant, project } from "@verific/drizzle/schema";
import { eq } from "@verific/drizzle/orm";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const updateProjectSchema = z.object({
	id: z.string().uuid(),
	name: z.string().optional(),
	description: z.string().optional(),
	url: z.string().optional(),
	researchUrl: z.string().optional().nullable(),
	address: z.string().optional(),
	latitude: z.number().optional(),
	longitude: z.number().optional(),
	isRegistrationEnabled: z.boolean().optional(),
	isResearchEnabled: z.boolean().optional(),
	isArchived: z.boolean().optional(),
	logoUrl: z.string().optional(),
	coverUrl: z.string().optional(),
	thumbnailUrl: z.string().optional(),
	primaryColor: z.string().optional().nullable(),
	secondaryColor: z.string().optional().nullable(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
});

export const projectsRouter = createTRPCRouter({
	createProject: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				description: z.string().optional().nullable(),
				address: z.string(),
				latitude: z.number(),
				longitude: z.number(),
				coverUrl: z.string().optional().nullable(),
				thumbnailUrl: z.string().optional().nullable(),
				startDate: z.coerce.date(),
				endDate: z.coerce.date(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const {
				name,
				description,
				address,
				latitude,
				longitude,
				coverUrl,
				thumbnailUrl,
				startDate,
				endDate,
			} = input;

			const userId = ctx.session.user.id;
			console.log("userId", userId);

			if (!userId) {
				throw new Error("User not found");
			}

			const url = name.toLowerCase().replace(/\s+/g, "-");

			const created = await db
				.insert(project)
				.values({
					name,
					description,
					url,
					address,
					latitude,
					longitude,
					coverUrl,
					thumbnailUrl,
					startDate,
					endDate,
					ownerId: userId,
				})
				.returning({ id: project.id, url: project.url });

			if (created.length === 0) {
				throw new Error("Project creation failed");
			}

			// We create a moderator participant for the owner
			await db.insert(participant).values({
				projectId: created[0]!.id,
				userId: userId,
				role: "moderator",
			});

			return { id: created[0]!.id, url: created[0]!.url };
		}),

	updateProject: protectedProcedure
		.input(updateProjectSchema)
		.mutation(async ({ input }) => {
			const { id, ...rest } = input;

			// Remove undefined fields so only provided fields are updated
			const updateData = Object.fromEntries(
				Object.entries(rest).filter(([_, v]) => v !== undefined),
			);

			if (Object.keys(updateData).length === 0) {
				throw new Error("No fields to update");
			}

			await db.update(project).set(updateData).where(eq(project.id, id));
			return { updated: true };
		}),

	getProject: publicProcedure
		.input(
			z.object({
				id: z.string().uuid().optional(),
				url: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			if (!input.id && !input.url) {
				throw new Error("Project ID or URL is required");
			}

			const whereClause = input.id
				? eq(project.id, input.id)
				: input.url
					? eq(project.url, input.url)
					: null;

			if (!whereClause) {
				throw new Error("Invalid input");
			}

			const projectData = await db.query.project.findFirst({
				where: whereClause,
				with: {
					speakers: true,
					participants: {
						columns: {
							id: true,
							userId: true,
						},
					},
					owner: {
						columns: {
							id: true,
							name: true,
							image_url: true,
							public_email: true,
						},
					},
				},
			});

			if (!projectData) {
				console.log(projectData);
				throw new Error("Project not found");
			}

			const userId = ctx.session?.user.id;

			return {
				project: projectData,
				isParticipant: userId
					? projectData.participants.some(
						(participant) => participant.userId === userId,
					)
					: false,
			};
		}),

	getProjects: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		if (!userId) {
			throw new Error("User not found");
		}

		return db.query.project.findMany({
			where: eq(project.ownerId, userId),
		});
	}),

	deleteProject: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			await db.delete(project).where(eq(project.id, input.id));
			return { success: true };
		}),
});
