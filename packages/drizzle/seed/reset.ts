import { count, inArray, like } from "drizzle-orm";

import * as schema from "../schema";
import { SEED_EMAIL_DOMAIN, SEED_URL_PREFIX, type SeedDb } from "./utils";

const isSeedProject = like(schema.project.url, `${SEED_URL_PREFIX}%`);
const isSeedUser = like(schema.user.email, `%@${SEED_EMAIL_DOMAIN}`);

export async function hasSeedData(db: SeedDb) {
	const [users] = await db
		.select({ amount: count() })
		.from(schema.user)
		.where(isSeedUser);
	const [projects] = await db
		.select({ amount: count() })
		.from(schema.project)
		.where(isSeedProject);

	return (users?.amount ?? 0) > 0 || (projects?.amount ?? 0) > 0;
}

// Remove só o que o seed criou; o restante (cascade) sai junto
export async function resetSeedData(db: SeedDb) {
	const projectIds = (
		await db
			.select({ id: schema.project.id })
			.from(schema.project)
			.where(isSeedProject)
	).map((project) => project.id);

	if (projectIds.length > 0) {
		// form_answers → campos e versões, activities → projects e
		// projects → users são `restrict`
		await db
			.delete(schema.formAnswer)
			.where(inArray(schema.formAnswer.projectId, projectIds));
		await db
			.delete(schema.activity)
			.where(inArray(schema.activity.projectId, projectIds));
		await db
			.delete(schema.project)
			.where(inArray(schema.project.id, projectIds));
	}

	await db.delete(schema.user).where(isSeedUser);
}
