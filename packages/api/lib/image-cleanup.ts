import { db } from "@verific/drizzle";
import { eq } from "@verific/drizzle/orm";
import { activity, speaker } from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import { IMAGE_PURPOSES, storage } from "./storage";

/** Evento dono da imagem, pelo formato da chave. */
export async function imageProjectId(key: string) {
	const parts = key.split("/");
	const fileName = parts.at(-1);
	if (!fileName || fileName === "..") return null;

	// `storage.buildKey`: <purpose>/<projectId>/<arquivo>
	if (parts.length === 3 && Object.hasOwn(IMAGE_PURPOSES, parts[0]!)) {
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

/**
 * Apaga do storage as imagens do evento que uma gravação deixou de usar.
 * Roda depois do commit: trocar a imagem e desistir de salvar não apaga a
 * que continua salva. Falhas ficam como objeto órfão.
 */
export async function deleteReplacedImages(
	projectId: string,
	before: Array<string | null | undefined>,
	after: Array<string | null | undefined>,
) {
	const kept = new Set(after.filter(Boolean));
	const replaced = [...new Set(before)].filter(
		(url): url is string => !!url && !kept.has(url),
	);
	await Promise.all(
		replaced.map(async (url) => {
			const key = storage.extractKey(url);
			if (!key || (await imageProjectId(key)) !== projectId) return;
			await storage.deleteObject(key);
		}),
	).catch((error: unknown) => {
		console.error("[storage] falha ao apagar imagem substituída:", error);
	});
}
