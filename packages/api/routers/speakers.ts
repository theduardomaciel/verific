import { db } from "@verific/drizzle";

import { z } from "zod";

import { project, speaker } from "@verific/drizzle/schema";
import { eq } from "@verific/drizzle/orm";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const speakersRouter = createTRPCRouter({
	createSpeaker: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				description: z.string(),
				imageUrl: z.string(),
				projectId: z.string().uuid(),
			}),
		)
		.mutation(async ({ input }) => {
			const { name, description, imageUrl, projectId } = input;
			const created = await db
				.insert(speaker)
				.values({
					name,
					description,
					image_url: imageUrl,
					projectId,
				})
				.returning({ id: speaker.id });
			return { id: created[0]?.id };
		}),

	updateSpeaker: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				name: z.string(),
				description: z.string(),
				imageUrl: z.string(),
				projectId: z.string().uuid(),
			}),
		)
		.mutation(async ({ input }) => {
			const { id, name, description, imageUrl, projectId } = input;
			await db
				.update(speaker)
				.set({
					name,
					description,
					image_url: imageUrl,
					projectId,
				})
				.where(eq(speaker.id, id));
			return { updated: true };
		}),

	getSpeaker: protectedProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ input }) => {
			const speakerData = await db.query.speaker.findFirst({
				where: eq(speaker.id, input.id),
			});
			if (!speakerData) {
				throw new Error("Speaker not found");
			}
			return speakerData;
		}),

	getSpeakers: protectedProcedure
		.input(z.object({ projectId: z.string().uuid().optional() }))
		.query(async ({ input }) => {
			if (input?.projectId) {
				return db.query.speaker.findMany({
					where: eq(speaker.projectId, input.projectId),
				});
			}
			return db.query.speaker.findMany();
		}),

	deleteSpeaker: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input }) => {
			await db.delete(speaker).where(eq(speaker.id, input.id));
			return { success: true };
		}),
});
