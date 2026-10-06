import { db } from "@verific/drizzle";

import { z } from "@verific/zod";

import { participant, project, projectModerator } from "@verific/drizzle/schema";
import { eventThemeSchema } from "@verific/drizzle/theme";
import { eq } from "@verific/drizzle/orm";
import { generateShortId } from "./profiles";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// API
import { TRPCError } from "@trpc/server";

export const updateProjectSchema = z.object({
	id: z.uuid(),
	name: z.string().optional(),
	description: z.string().optional(),
	url: z.string().optional(),
	address: z.string().optional(),
	latitude: z.number().optional(),
	longitude: z.number().optional(),
	isRegistrationEnabled: z.boolean().optional(),
	isArchived: z.boolean().optional(),
	logoUrl: z.string().optional(),
	logoDarkUrl: z.string().optional().nullable(),
	largeLogoUrl: z.string().optional().nullable(),
	largeLogoDarkUrl: z.string().optional().nullable(),
	coverUrl: z.string().optional(),
	thumbnailUrl: z.string().optional(),
	primaryColor: z.string().optional().nullable(),
	secondaryColor: z.string().optional().nullable(),
	theme: eventThemeSchema.optional(),
	profilesEnabled: z.boolean().optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
});

async function requireProjectAccess(projectId: string, userId: string) {
	const data = await db.query.project.findFirst({
		where: eq(project.id, projectId),
		with: { moderators: { columns: { userId: true } } },
	});
	if (!data) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
	}
	const allowed =
		data.ownerId === userId ||
		data.moderators.some((m) => m.userId === userId);
	if (!allowed) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Sem permissão neste evento.",
		});
	}
	return data;
}

export const projectsRouter = createTRPCRouter({
	createProject: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				description: z.string().optional().nullable(),
				address: z.string(),
				latitude: z.number(),
				longitude: z.number(),
				logoUrl: z.string().optional().nullable(),
				logoDarkUrl: z.string().optional().nullable(),
				largeLogoUrl: z.string().optional().nullable(),
				largeLogoDarkUrl: z.string().optional().nullable(),
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
				logoDarkUrl,
				largeLogoDarkUrl,
				thumbnailUrl,
				logoUrl,
				largeLogoUrl,
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
					logoUrl,
					largeLogoUrl,
					coverUrl,
				logoDarkUrl,
				largeLogoDarkUrl,
					thumbnailUrl,
					startDate,
					endDate,
					ownerId: userId,
				})
				.returning({ id: project.id, url: project.url });

			if (created.length === 0) {
				throw new Error("Project creation failed");
			}

			// We create a monitor participant for the owner
			await db.insert(participant).values({
				projectId: created[0]!.id,
				userId: userId,
				shortId: generateShortId(),
			});

			return { id: created[0]!.id, url: created[0]!.url };
		}),

	updateProject: protectedProcedure
		.input(updateProjectSchema)
		.mutation(async ({ input, ctx }) => {
			const { id, ...rest } = input;

			await requireProjectAccess(id, ctx.session.user.id);

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
		.query(async ({ input }) => {
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
					/* speakers: true,
					participants: {
						columns: {
							id: true,
							userId: true,
						},
					}, */
					owner: {
						columns: {
							id: true,
							name: true,
							image_url: true,
							publicEmail: true,
						},
					},
				},
			});

			if (!projectData) {
				console.log(projectData);
				throw new Error("Project not found");
			}

			return {
				project: projectData,
			};
		}),

	getProjects: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		if (!userId) {
			throw new Error("User not found");
		}

		const ownerProjects = db.query.project.findMany({
			where: eq(project.ownerId, userId),
		});

		const sharedProjects = db.query.projectModerator.findMany({
			where: eq(projectModerator.userId, userId),
			with: {
				project: true,
			},
		});

		const [owned, shared] = await Promise.all([
			ownerProjects,
			sharedProjects,
		]);

		return { owned, shared: shared.map((sp) => sp.project) };
	}),

	getAllProjects: publicProcedure.query(async () => {
		return db.query.project.findMany();
	}),

	deleteProject: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			await db.delete(project).where(eq(project.id, input.id));
			return { success: true };
		}),
});
