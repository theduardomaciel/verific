import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import { eq } from "@verific/drizzle/orm";
import { activity, speaker } from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import { requireProjectAccess } from "../lib/project-access";
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

/** Evento dono da imagem, pelo formato da chave. */
async function imageProjectId(key: string) {
	const parts = key.split("/");
	const fileName = parts.at(-1);
	if (!fileName || fileName === "..") return null;

	// `storage.buildKey`: <purpose>/<projectId>/<arquivo>
	if (parts.length === 3 && purposeSchema.safeParse(parts[0]).success) {
		return parts[1];
	}

	// tools/scripts/migrate-image-urls.ts: migrated/<tabela>/<id>/<coluna>.webp
	const [prefix, table, id = ""] = parts;
	if (parts.length !== 4 || prefix !== "migrated") return null;
	if (table === "projects") return id;
	if (table === "activities" && z.uuid().safeParse(id).success) {
		const row = await db.query.activity.findFirst({
			where: eq(activity.id, id),
			columns: { projectId: true },
		});
		return row?.projectId ?? null;
	}
	if (table === "speakers" && /^\d+$/.test(id)) {
		const row = await db.query.speaker.findFirst({
			where: eq(speaker.id, Number(id)),
			columns: { projectId: true },
		});
		return row?.projectId ?? null;
	}
	return null;
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
			if ((await imageProjectId(key)) !== input.projectId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "A imagem não pertence a este evento.",
				});
			}
			try {
				await storage.deleteObject(key);
				return { deleted: true };
			} catch {
				return { deleted: false };
			}
		}),
});
