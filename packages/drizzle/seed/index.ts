import { Faker, base, en, pt_BR } from "@faker-js/faker";
import { eq } from "drizzle-orm";

import * as schema from "../schema";
import { buildUser } from "./factories";
import { profiles, type ProfileName } from "./profiles";
import { hasSeedData, resetSeedData } from "./reset";
import { seedEvent } from "./seed-event";
import { insertInChunks, SEED_EMAIL_DOMAIN, type SeedDb } from "./utils";

export { profiles, STRESS_EVENT, type ProfileName } from "./profiles";
export { hasSeedData, resetSeedData } from "./reset";
export * from "./factories";
export * from "./seed-event";
export * from "./notification-fixtures";
export * from "./utils";

export interface SeedOptions {
	profile: ProfileName;
	seed: number;
	// Usuário real que será dono dos eventos; sem ele, cria um dono fictício
	ownerId?: string;
	reset?: boolean;
	// Base para as datas; com a mesma semente e data, os dados se repetem
	refDate: Date;
	// Linhas fictícias de notificação (dev). Default: true.
	notifications?: boolean;
}

export async function seed(db: SeedDb, options: SeedOptions) {
	const profile = profiles[options.profile];

	const faker = new Faker({ locale: [pt_BR, en, base] });
	faker.seed(options.seed);
	faker.setDefaultRefDate(options.refDate);

	return db.transaction(async (tx) => {
		if (options.reset) {
			await resetSeedData(tx);
		} else if (await hasSeedData(tx)) {
			throw new Error(
				"O banco já tem dados do seed. Rode de novo com --reset para substituí-los.",
			);
		}

		const ownerId = options.ownerId
			? await assertUserExists(tx, options.ownerId)
			: await createSeedOwner(tx);

		const users = Array.from({ length: profile.users }, (_, i) =>
			buildUser(faker, i + 1),
		);
		await insertInChunks(tx, schema.user, users);

		const events = [];
		for (const [index, spec] of profile.events.entries()) {
			events.push(
				await seedEvent(tx, faker, {
					index,
					spec,
					users,
					ownerId,
					refDate: options.refDate,
					notifications: options.notifications ?? true,
				}),
			);
		}

		return { ownerId, users: users.length, events };
	});
}

async function assertUserExists(db: SeedDb, userId: string) {
	const user = await db.query.user.findFirst({
		where: eq(schema.user.id, userId),
		columns: { id: true },
	});
	if (!user) {
		throw new Error(`Usuário ${userId} não encontrado.`);
	}
	return user.id;
}

// Sem faker, para que os demais dados não mudem com ou sem --ownerId
async function createSeedOwner(db: SeedDb) {
	const [owner] = await db
		.insert(schema.user)
		.values({
			name: "Organização (seed)",
			email: `owner@${SEED_EMAIL_DOMAIN}`,
			emailVerified: true,
			publicEmail: `owner@${SEED_EMAIL_DOMAIN}`,
		})
		.returning({ id: schema.user.id });
	return owner!.id;
}
