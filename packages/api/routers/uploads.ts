import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import { eq } from "@verific/drizzle/orm";
import { project } from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import {
	IMAGE_PURPOSES,
	isPassthroughPurpose,
	passthroughExtension,
	storage,
	validateUploadInput,
	type ImagePurpose,
} from "../lib/storage";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const purposeSchema = z.enum([
	"event-logo",
	"event-logo-wide",
	"event-cover",
	"event-thumbnail",
	"speaker",
	"activity-banner",
	"badge-artwork",
]);

async function requireProjectAccess(projectId: string, userId: string) {
	const data = await db.query.project.findFirst({
		where: eq(project.id, projectId),
		with: { moderators: { columns: { userId: true } } },
	});
	if (!data) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Evento não encontrado.",
		});
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

export const uploadsRouter = createTRPCRouter({
	requestImageUpload: protectedProcedure
		.input(
			z.object({
				purpose: purposeSchema,
				projectId: z.string().uuid(),
				contentType: z.string(),
				contentLength: z.number().int().positive(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const purpose = input.purpose as ImagePurpose;
			validateUploadInput({
				purpose,
				contentType: input.contentType,
				contentLength: input.contentLength,
			});
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			if (!storage.isConfigured()) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Armazenamento de imagens não configurado.",
				});
			}
			const key = isPassthroughPurpose(purpose)
				? storage.buildKey(
						purpose,
						input.projectId,
						passthroughExtension(input.contentType),
					)
				: storage.buildKey(purpose, input.projectId);
			const config = IMAGE_PURPOSES[purpose];
			const { uploadUrl, publicUrl } = await storage.createPresignedPut({
				key,
				contentType: isPassthroughPurpose(purpose)
					? input.contentType
					: (config as { outputMime: string }).outputMime,
				contentLength: input.contentLength,
			});
			return { key, uploadUrl, publicUrl };
		}),

	deleteImage: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				publicUrlOrKey: z.string().min(1),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const key = storage.extractKey(input.publicUrlOrKey);
			if (!key) return { deleted: false };
			try {
				await storage.deleteObject(key);
				return { deleted: true };
			} catch {
				return { deleted: false };
			}
		}),
});
