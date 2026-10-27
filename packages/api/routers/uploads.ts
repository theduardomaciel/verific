import { TRPCError } from "@trpc/server";

import { z } from "@verific/zod";

import { requireProjectPermission } from "../lib/project-access";
import {
	extensionForContentType,
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
			await requireProjectPermission(
				input.projectId,
				ctx.session.user.id,
				purpose === "speaker" || purpose === "activity-banner"
					? "activities.manage"
					: "event.manage",
			);
			if (!storage.isConfigured()) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Armazenamento de imagens não configurado.",
				});
			}
			const key = storage.buildKey(
				purpose,
				input.projectId,
				extensionForContentType(input.contentType),
			);
			const { uploadUrl, publicUrl } = await storage.createPresignedPut({
				key,
				contentType: input.contentType,
				contentLength: input.contentLength,
			});
			return { key, uploadUrl, publicUrl };
		}),
});
