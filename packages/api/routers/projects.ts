// API
import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import { and, eq } from "@verific/drizzle/orm";
import {
	participant,
	project,
	projectModerator,
	user,
} from "@verific/drizzle/schema";
import { eventThemeSchema } from "@verific/drizzle/theme";
import { z } from "@verific/zod";

import {
	requireProjectAccess,
	requireProjectOwner,
} from "../lib/project-access";
import { normalizeThemeFonts } from "../lib/theme-fonts";
import {
	notifyProjectContributorAdded,
	notifyProjectDeleted,
} from "../notifications/triggers";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { generateShortId } from "./profiles";

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
	logoSide: z.number().int().positive().optional().nullable(),
	logoDarkSide: z.number().int().positive().optional().nullable(),
	largeLogoWidth: z.number().int().positive().optional().nullable(),
	largeLogoHeight: z.number().int().positive().optional().nullable(),
	largeLogoDarkWidth: z.number().int().positive().optional().nullable(),
	largeLogoDarkHeight: z.number().int().positive().optional().nullable(),
	coverUrl: z.string().optional(),
	thumbnailUrl: z.string().optional(),
	primaryColor: z.string().optional().nullable(),
	secondaryColor: z.string().optional().nullable(),
	theme: eventThemeSchema.optional(),
	profilesEnabled: z.boolean().optional(),
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

			// Valida as fontes contra o catálogo e normaliza a categoria
			// (o schema é tolerante na leitura; aqui a escrita é estrita).
			if (rest.theme) {
				rest.theme = normalizeThemeFonts(rest.theme);
			}

			// Remove undefined fields so only provided fields are updated
			const updateData = Object.fromEntries(
				Object.entries(rest).filter(([_key, v]) => v !== undefined),
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
		.mutation(async ({ input, ctx }) => {
			// Deletion is irreversible: owner-only, unlike updateProject
			// where moderators are allowed.
			const projectRow = await requireProjectOwner(
				input.id,
				ctx.session.user.id,
			);

			// Capture contributors before deletion so we can notify them.
			const contributorRows = await db.query.projectModerator.findMany({
				where: eq(projectModerator.projectId, input.id),
				with: { user: true },
			});

			const ownerRows = await db
				.select({ name: user.name })
				.from(user)
				.where(eq(user.id, ctx.session.user.id));
			const deletedByName = ownerRows[0]?.name?.trim() || undefined;

			await db.delete(project).where(eq(project.id, input.id));

			void notifyProjectDeleted({
				projectId: input.id,
				projectName: projectRow.name,
				contributors: contributorRows
					.map((row) => ({
						userId: row.userId,
						name: row.user?.name ?? null,
						email: row.user?.email ?? "",
					}))
					.filter((c) => c.email.trim() !== ""),
				deletedByName,
			});

			return { success: true };
		}),

	listProjectContributors: protectedProcedure
		.input(z.object({ projectId: z.string().uuid() }))
		.query(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const rows = await db.query.projectModerator.findMany({
				where: eq(projectModerator.projectId, input.projectId),
				with: { user: true },
			});
			return rows.map((row) => ({
				userId: row.userId,
				name: row.user?.name ?? null,
				email: row.user?.email ?? null,
				assignedAt: row.assignedAt,
			}));
		}),

	addProjectContributor: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				email: z.string().email(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await requireProjectOwner(input.projectId, ctx.session.user.id);

			const userRows = await db
				.select({
					id: user.id,
					email: user.email,
					name: user.name,
				})
				.from(user)
				.where(eq(user.email, input.email));
			const contributor = userRows[0];
			if (!contributor) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Usuário não encontrado para este e-mail.",
				});
			}

			// Don't add the owner as a contributor.
			const projectRow = await db.query.project.findFirst({
				where: eq(project.id, input.projectId),
			});
			if (projectRow?.ownerId === contributor.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "O dono do projeto já tem acesso.",
				});
			}

			const existing = await db.query.projectModerator.findFirst({
				where: and(
					eq(projectModerator.projectId, input.projectId),
					eq(projectModerator.userId, contributor.id),
				),
			});
			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Este usuário já é contribuidor do projeto.",
				});
			}

			await db.insert(projectModerator).values({
				projectId: input.projectId,
				userId: contributor.id,
			});

			const contributorEmail = contributor.email?.trim();
			if (contributorEmail) {
				void notifyProjectContributorAdded({
					projectId: input.projectId,
					contributorUserId: contributor.id,
					to: contributorEmail,
					addedByUserId: ctx.session.user.id,
				});
			}

			return { added: true, userId: contributor.id };
		}),

	removeProjectContributor: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				userId: z.string().uuid(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await requireProjectOwner(input.projectId, ctx.session.user.id);
			await db
				.delete(projectModerator)
				.where(
					and(
						eq(projectModerator.projectId, input.projectId),
						eq(projectModerator.userId, input.userId),
					),
				);
			return { removed: true };
		}),
});
