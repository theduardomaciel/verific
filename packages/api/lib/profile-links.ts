import { db } from "@verific/drizzle";
import {
	formField,
	profileFieldVisibility,
	project,
} from "@verific/drizzle/schema";
import {
	parseProfileLayout,
	PROFILE_SLOTS,
	type ProfileLayout,
	type ProfileSlotKey,
} from "@verific/drizzle/profile-layout";
import { eq, inArray } from "@verific/drizzle/orm";

/** Lê o layout do evento (sempre válido: fallback p/ padrão). */
export async function readProjectLayout(
	projectId: string,
): Promise<ProfileLayout> {
	const row = await db.query.project.findFirst({
		where: eq(project.id, projectId),
		columns: { profileLayout: true },
	});
	return parseProfileLayout(row?.profileLayout);
}

export async function writeProjectLayout(
	projectId: string,
	layout: ProfileLayout,
): Promise<void> {
	await db.update(project).set({ profileLayout: layout }).where(
		eq(project.id, projectId),
	);
}

/** Todos os fieldIds ligados, em qualquer slot. */
export function linkedFieldIds(layout: ProfileLayout): string[] {
	const ids = [
		layout.subtitleFieldId,
		layout.bioFieldId,
		layout.socialsFieldId,
		layout.emailFieldId,
		...layout.stats.map((s) => s.fieldId),
	].filter((id): id is string => Boolean(id));
	return [...new Set(ids)];
}

export function slotForField(
	layout: ProfileLayout,
	fieldId: string,
): { slot: ProfileSlotKey; statIndex: number | null } | null {
	if (layout.subtitleFieldId === fieldId)
		return { slot: "subtitle", statIndex: null };
	if (layout.bioFieldId === fieldId) return { slot: "bio", statIndex: null };
	if (layout.socialsFieldId === fieldId)
		return { slot: "socials", statIndex: null };
	if (layout.emailFieldId === fieldId)
		return { slot: "email", statIndex: null };
	const statIndex = layout.stats.findIndex((s) => s.fieldId === fieldId);
	if (statIndex >= 0) return { slot: "stats", statIndex };
	return null;
}

export function isCompatible(slot: ProfileSlotKey, type: string): boolean {
	return (PROFILE_SLOTS[slot].accepts as readonly string[]).includes(type);
}

/**
 * Remove links p/ os campos + apaga flags de visibilidade (sem estado
 * morto). Usado ao excluir campo/versão, trocar tipo incompatível ou
 * remover link no editor.
 */
export async function removeProfileLinksForFields(
	projectId: string,
	fieldIds: string[],
): Promise<ProfileLayout | null> {
	if (fieldIds.length === 0) return null;
	const layout = await readProjectLayout(projectId);
	const doomed = new Set(fieldIds);
	let changed = false;
	const next: ProfileLayout = {
		...layout,
		subtitleFieldId: layout.subtitleFieldId ?? null,
		bioFieldId: layout.bioFieldId ?? null,
		socialsFieldId: layout.socialsFieldId ?? null,
		emailFieldId: layout.emailFieldId ?? null,
		stats: layout.stats.filter((s) => {
			if (doomed.has(s.fieldId)) {
				changed = true;
				return false;
			}
			return true;
		}),
	};
	for (const key of [
		"subtitleFieldId",
		"bioFieldId",
		"socialsFieldId",
		"emailFieldId",
	] as const) {
		if (next[key] && doomed.has(next[key] as string)) {
			next[key] = null;
			changed = true;
		}
	}
	await db
		.delete(profileFieldVisibility)
		.where(inArray(profileFieldVisibility.fieldId, fieldIds));
	if (changed) await writeProjectLayout(projectId, next);
	return changed ? next : layout;
}

/**
 * Remapeia links (e copia flags de visibilidade) após clone de versão,
 * pelo mesmo mapa oldId->newId das chaves. Links sem correspondência
 * são descartados; só roda p/ formulários do evento.
 */
export async function remapProfileLinksOnClone(
	projectId: string,
	isEventScope: boolean,
	idMap: Map<string, string>,
): Promise<void> {
	if (!isEventScope || idMap.size === 0) return;
	const layout = await readProjectLayout(projectId);
	const remap = (id: string | null | undefined) =>
		id && idMap.has(id) ? (idMap.get(id) as string) : null;
	let changed = false;
	const next: ProfileLayout = { ...layout };
	for (const key of [
		"subtitleFieldId",
		"bioFieldId",
		"socialsFieldId",
		"emailFieldId",
	] as const) {
		const current = layout[key];
		if (!current) {
			next[key] = null;
			continue;
		}
		const mapped = remap(current);
		if (mapped !== current) changed = true;
		next[key] = mapped;
	}
	next.stats = [];
	for (const s of layout.stats) {
		const mapped = idMap.get(s.fieldId);
		if (mapped) {
			if (mapped !== s.fieldId) changed = true;
			next.stats.push({ ...s, fieldId: mapped });
		} else {
			changed = true;
		}
	}
	const oldIds = [...idMap.keys()];
	if (oldIds.length > 0) {
		const rows = await db.query.profileFieldVisibility.findMany({
			where: inArray(profileFieldVisibility.fieldId, oldIds),
		});
		for (const row of rows) {
			const nid = idMap.get(row.fieldId);
			if (!nid) continue;
			await db
				.insert(profileFieldVisibility)
				.values({
					participantId: row.participantId,
					fieldId: nid,
					visible: row.visible,
				})
				.onConflictDoNothing();
		}
	}
	if (changed) await writeProjectLayout(projectId, next);
}

/** Apaga flags de visibilidade (ex: campo obrigatório virou opcional). */
export async function dropVisibilityForFields(
	fieldIds: string[],
): Promise<void> {
	if (fieldIds.length === 0) return;
	await db
		.delete(profileFieldVisibility)
		.where(inArray(profileFieldVisibility.fieldId, fieldIds));
}

/** Linhas de um campo (p/ checar tipo/required atuais na validação). */
export async function getLinkedFieldRows(fieldIds: string[]) {
	if (fieldIds.length === 0) return [];
	return db.query.formField.findMany({
		where: inArray(formField.id, fieldIds),
		columns: {
			id: true,
			projectId: true,
			key: true,
			type: true,
			required: true,
			isActive: true,
		},
	});
}

export async function fieldUsesInLayout(
	projectId: string,
	fieldId: string,
): Promise<boolean> {
	const layout = await readProjectLayout(projectId);
	return linkedFieldIds(layout).includes(fieldId);
}
