import { env } from "@verific/env";
import { faker } from "@faker-js/faker";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import {
	ace,
	event,
	eventTypes,
	period,
	user,
	member,
	userCourses,
	memberRoles,
	memberExperiences,
	userPeriods,
	memberOnEvent,
} from "./schema";

import * as schema from "./schema";

const connection = neon(env.DATABASE_URL);
const db = drizzle(connection as NeonQueryFunction<boolean, boolean>, {
	schema,
});

export async function seedAces() {
	const data: (typeof ace.$inferInsert)[] = [];

	for (let i = 0; i < 10; i++) {
		data.push({
			id: i,
			hours: faker.number.int({ min: 10, max: 25 }),
			name: faker.lorem.sentence({ min: 3, max: 6 }).slice(0, -1),
			description: faker.lorem.paragraph({ min: 1, max: 3 }),
			projectId: env.PROJECT_ID,
		});
	}

	console.log("🌱 Semeando o banco de dados... [Ace]");
	await db.insert(ace).values(data);
	console.log("✅ Banco de dados semeado com Aces!");
}

export async function seedPeriods() {
	const data: (typeof period.$inferInsert)[] = [];

	const semester = Math.random() > 0.5 ? "1" : "2";

	for (let i = 0; i < 10; i++) {
		data.push({
			slug: `202${i}.${semester}`,
			from: faker.date.recent({ days: 365 }),
			to: faker.date.future({ years: 1 }),
		});
	}

	console.log("🌱 Semeando o banco de dados... [Period]");
	await db.insert(period).values(data);
	console.log("✅ Banco de dados semeado com períodos!");
}

export async function seedUsersAndMembers() {
	const data: (typeof user.$inferInsert)[] = [];
	const memberData: (typeof member.$inferInsert)[] = [];

	for (let i = 0; i < 10; i++) {
		const email = faker.internet.email();

		const randomCourse =
			userCourses[Math.floor(Math.random() * userCourses.length)];
		const randomPeriod =
			userPeriods[Math.floor(Math.random() * userPeriods.length)];

		const randomRole =
			memberRoles[Math.floor(Math.random() * memberRoles.length)];
		const randomExperience =
			memberExperiences[
				Math.floor(Math.random() * memberExperiences.length)
			];

		data.push({
			id: faker.string.uuid(),
			name: faker.person.fullName(),
			email,
			emailVerified: faker.date.recent(),
			image: faker.image.avatar(),
			course: randomCourse,
			registrationId: faker.string.numeric({ length: 8 }),
			period: randomPeriod,
		});

		memberData.push({
			userId: data[i].id as string,
			projectId: env.PROJECT_ID,
			username: faker.internet.userName(),
			role: randomRole,
			experience: randomExperience,
			joinedAt: faker.date.recent(),
		});
	}

	console.log("🌱 Semeando o banco de dados... [User]");
	await db.insert(user).values(data);
	console.log("✅ Banco de dados semeado com usuários!");

	console.log("🌱 Semeando o banco de dados... [Member]");
	await db.insert(member).values(memberData);
	console.log("✅ Banco de dados semeado com membros!");
}

export async function seedEvents() {
	const data: (typeof event.$inferInsert)[] = [];

	for (let i = 0; i < 20; i++) {
		const randomType =
			eventTypes[Math.floor(Math.random() * eventTypes.length)];

		data.push({
			name: faker.lorem.words(),
			description: faker.lorem.paragraph(),
			dateFrom: faker.date.recent(),
			dateTo: faker.date.future(),
			type: randomType,
			aceId: faker.number.int({ min: 0, max: 9 }),
			projectId: env.PROJECT_ID,
		});
	}

	console.log("🌱 Semeando o banco de dados... [Event]");
	await db.insert(event).values(data);
	console.log("✅ Banco de dados semeado com eventos!");
}

export async function seedMembersOnEvents() {
	const members = await db.query.member.findMany({
		where(fields, { eq }) {
			return eq(fields.projectId, env.PROJECT_ID);
		},
	});

	const events = await db.query.event.findMany({
		where(fields, { eq }) {
			return eq(fields.projectId, env.PROJECT_ID);
		},
	});

	const data: (typeof memberOnEvent.$inferInsert)[] = [];

	for (const event of events) {
		for (const member of members) {
			if (Math.random() > 0.5) {
				data.push({
					memberId: member.id as string,
					eventId: event.id as string,
				});
			}
		}
	}

	console.log("🌱 Semeando o banco de dados... [MemberOnEvent]");
	await db.insert(memberOnEvent).values(data);
	console.log("✅ Banco de dados semeado com membros em eventos!");
}

export async function seed() {
	await seedAces();
	await seedPeriods();
	await seedUsersAndMembers();
	await seedEvents();
	await seedMembersOnEvents();
}

seed().catch((error) => {
	console.error("❌ Erro ao semear o banco de dados:", error);
	process.exit(1);
});
