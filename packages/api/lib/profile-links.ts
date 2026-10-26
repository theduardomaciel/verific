import { db } from "@verific/drizzle";
import { and, eq, inArray, isNull } from "@verific/drizzle/orm";
import {
	isCompatible,
	parseProfileLayout,
	slotForField,
	type ProfileLayout,
} from "@verific/drizzle/profile-layout";
import {
	formField,
	formVersion,
	profileFieldVisibility,
	project,
} from "@verific/drizzle/schema";

export { isCompatible, slotForField };

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
	await db
		.update(project)
		.set({ profileLayout: layout })
		.where(eq(project.id, projectId));
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

type FieldRef = { id: string; key: string; type: string };

/**
 * Troca cada link pelo campo de mesma chave e tipo compatível em `target`;
 * sem correspondência, o link sai. `only` limita a troca a esses ids.
 */
export function relinkLayout(
	layout: ProfileLayout,
	linked: FieldRef[],
	target: FieldRef[],
	only?: Set<string>,
): ProfileLayout {
	const keyById = new Map(linked.map((f) => [f.id, f.key]));
	const targetByKey = new Map(target.map((f) => [f.key, f]));
	const relink = (
		slot: Parameters<typeof isCompatible>[0],
		id: string | null | undefined,
	) => {
		if (!id) return null;
		if (only && !only.has(id)) return id;
		const match = targetByKey.get(keyById.get(id) ?? "");
		return match && isCompatible(slot, match.type) ? match.id : null;
	};
	return {
		...layout,
		subtitleFieldId: relink("subtitle", layout.subtitleFieldId),
		bioFieldId: relink("bio", layout.bioFieldId),
		socialsFieldId: relink("socials", layout.socialsFieldId),
		emailFieldId: relink("email", layout.emailFieldId),
		stats: layout.stats.flatMap((item) => {
			const fieldId = relink("stats", item.fieldId);
			return fieldId ? [{ ...item, fieldId }] : [];
		}),
	};
}

/**
 * Aponta os links do perfil para os campos de `versionId` (a versão que
 * acabou de ser publicada) e copia para eles as escolhas de visibilidade.
 */
export async function relinkProfileToVersion(
	projectId: string,
	versionId: string,
	onlyFieldIds?: string[],
): Promise<void> {
	const layout = await readProjectLayout(projectId);
	const only = onlyFieldIds ? new Set(onlyFieldIds) : undefined;
	const ids = linkedFieldIds(layout).filter((id) => !only || only.has(id));
	if (ids.length === 0) return;
	const [linked, target] = await Promise.all([
		getLinkedFieldRows(ids),
		db.query.formField.findMany({
			where: and(
				eq(formField.formVersionId, versionId),
				eq(formField.isActive, true),
			),
			columns: { id: true, key: true, type: true },
		}),
	]);
	const next = relinkLayout(layout, linked, target, only);
	if (JSON.stringify(next) === JSON.stringify(layout)) return;

	const targetByKey = new Map(target.map((f) => [f.key, f.id]));
	const rows = await db.query.profileFieldVisibility.findMany({
		where: inArray(profileFieldVisibility.fieldId, ids),
	});
	const keyById = new Map(linked.map((f) => [f.id, f.key]));
	const copies = rows.flatMap((row) => {
		const fieldId = targetByKey.get(keyById.get(row.fieldId) ?? "");
		return fieldId
			? [
					{
						participantId: row.participantId,
						fieldId,
						visible: row.visible,
					},
				]
			: [];
	});
	await db.transaction(async (tx) => {
		if (copies.length > 0) {
			await tx
				.insert(profileFieldVisibility)
				.values(copies)
				.onConflictDoNothing();
		}
		await tx
			.update(project)
			.set({ profileLayout: next })
			.where(eq(project.id, projectId));
	});
}

/**
 * Campos de rascunho que vão sumir ou mudar de tipo: os links que apontam
 * para eles voltam para a versão publicada (mesma chave); sem ela, saem.
 */
export async function detachProfileLinks(
	projectId: string,
	fieldIds: string[],
): Promise<void> {
	if (fieldIds.length === 0) return;
	const published = await db.query.formVersion.findFirst({
		where: and(
			eq(formVersion.projectId, projectId),
			isNull(formVersion.activityId),
			eq(formVersion.isPublished, true),
		),
		columns: { id: true },
	});
	if (published) {
		await relinkProfileToVersion(projectId, published.id, fieldIds);
	} else {
		await removeProfileLinksForFields(projectId, fieldIds);
	}
}

/** Apaga as escolhas de visibilidade das perguntas que saíram do perfil. */
export async function dropVisibilityForKeys(
	projectId: string,
	keys: string[],
): Promise<void> {
	if (keys.length === 0) return;
	await db.delete(profileFieldVisibility).where(
		inArray(
			profileFieldVisibility.fieldId,
			db
				.select({ id: formField.id })
				.from(formField)
				.where(
					and(
						eq(formField.projectId, projectId),
						inArray(formField.key, keys),
					),
				),
		),
	);
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
