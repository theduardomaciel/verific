import { faker } from "@faker-js/faker";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const env = {
	PROJECT_ID: "23b837ef-3321-4d0f-9b42-2aaab4c57dd4",
	DATABASE_URL:
		"postgresql://verific.ufal:84evKqXaUNth@ep-bold-breeze-a42pkssu-pooler.us-east-1.aws.neon.tech/verific.db?sslmode=require",
};

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
import { eq, inArray } from "drizzle-orm";

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

	const fetch_data = await fetch(
		"https://secomp.pythonanywhere.com/subscribe/participant",
	);
	const usersData = await fetch_data.json();

	for (const user_data of usersData) {
		const email = user_data["email"];

		const randomExperience =
			memberExperiences[
				Math.floor(Math.random() * memberExperiences.length)
			];

		data.push({
			id: user_data["id"],
			name: user_data["nome"],
			email,
			emailVerified: new Date(user_data["created_at"]),
			image: "https://i.imgur.com/y3xUR5B.png",
			course: "cc",
			registrationId: user_data["id"],
			period: "1",
		});

		memberData.push({
			userId: user_data["id"],
			projectId: env.PROJECT_ID,
			username: user_data["email"],
			role: memberRoles["0"],
			experience: randomExperience,
			joinedAt: new Date(user_data["created_at"]),
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

async function updateAdmins() {
	try {
		const admins = await db.query.account.findMany({
			with: {
				user: true,
			},
		});

		const adminEmails = admins.map((admin) => admin.user.email);
		console.log(adminEmails);

		await db
			.update(member)
			.set({
				role: "admin",
			})
			.where(inArray(member.username, adminEmails));
	} catch (error) {
		console.error("❌ Erro ao atualizar membros para admin:", error);
	}
}

/* updateAdmins().catch((error) => {
	console.error("❌ Erro ao atualizar membros para admin:", error);
	process.exit(1);
}); */

async function resetMembersOnEvent() {
	const accounts = await db.query.account.findMany({
		with: {
			user: true,
		},
	});

	accounts.forEach(async (account) => {
		console.log(account.user.email);
	});
	/* try {
		await db
			.delete(memberOnEvent);
	} catch (error) {
		console.error("Erro")
	} */
}

resetMembersOnEvent().catch((error) => {
	console.error("❌ Erro ao atualizar remover tests", error);
	process.exit(1);
});
