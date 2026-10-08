import "dotenv/config";
import { drizzle_env as env } from "@verific/env/drizzle_env";

console.log("DATABASE_URL:");
console.log(env.DATABASE_URL);

import { fakerPT_BR as faker } from "@faker-js/faker";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// Extrai ownerId da linha de comando
const ownerIdArg = process.argv.find((arg) => arg.startsWith("--ownerId="));
const ownerId = ownerIdArg ? ownerIdArg.split("=")[1] : undefined;
if (!ownerId) {
	console.error(
		"❌ Argumento --ownerId=ID é obrigatório. Exemplo: pnpm tsx seed.ts --ownerId=SEU_ID",
	);
	process.exit(1);
}

const connection = neon(env.DATABASE_URL);
const db = drizzle(connection as NeonQueryFunction<boolean, boolean>, {
	schema,
});

async function seedUsers() {
	const users: (typeof schema.user.$inferInsert)[] = [];
	const randomAmount = Math.floor(Math.random() * 251) + 250;
	for (let i = 0; i < randomAmount; i++) {
		const sex = Math.random() > 0.5 ? "male" : "female";

		users.push({
			name: faker.person.fullName({ sex: sex }),
			email: faker.internet.email(),
			emailVerified: true,
			publicEmail: faker.internet.email(),
			image_url: faker.image.personPortrait({ sex: sex }),
		});
	}
	console.log("🌱 Semeando usuários...");
	const inserted = await db.insert(schema.user).values(users).returning();
	console.log("✅ Usuários inseridos!");
	return inserted;
}

// NOTE: `users` não é usado aqui — projetos seedados usam `ownerId` do
// ambiente. Mantido no parâmetro para simetria com `seedParticipants`.
async function seedProjects(_users: any[]) {
	const projects: (typeof schema.project.$inferInsert)[] = [];
	for (let i = 0; i < 2; i++) {
		const name = faker.company.name();
		projects.push({
			name: name,
			description: faker.lorem.paragraphs({
				min: 2,
				max: 6,
			}),
			url: name.toLowerCase().replace(/\s+/g, "-"),
			address: faker.location.streetAddress(),
			isRegistrationEnabled: faker.datatype.boolean(),
			isArchived: false,
			logoUrl: faker.image.urlPicsumPhotos(),
			coverUrl: faker.image.urlPicsumPhotos(),
			thumbnailUrl: faker.image.urlPicsumPhotos(),
			primaryColor: faker.color.rgb({ format: "hex", casing: "lower" }),
			secondaryColor: faker.color.rgb({ format: "hex", casing: "lower" }),
			startDate: faker.date.past(),
			endDate: faker.date.future(),
			ownerId: ownerId!,
		});
	}
	console.log("🌱 Semeando projetos...");
	const inserted = await db
		.insert(schema.project)
		.values(projects)
		.returning();
	console.log("✅ Projetos inseridos!");
	return inserted;
}

async function seedParticipants(users: any[], projects: any[]) {
	const participants: (typeof schema.participant.$inferInsert)[] = [];
	for (let i = 0; i < users.length; i++) {
		participants.push({
			userId: users[i].id,
			projectId: projects[i % projects.length].id,
			joinedAt: faker.date.past(),
			shortId: faker.string.alphanumeric({ length: 10 }),
		});
	}
	console.log("🌱 Semeando participantes...");
	const inserted = await db
		.insert(schema.participant)
		.values(participants)
		.returning();
	console.log("✅ Participantes inseridos!");
	return inserted;
}

async function seedSpeakers(projects: any[]) {
	const speakers: (typeof schema.speaker.$inferInsert)[] = [];
	for (let i = 0; i < 20; i++) {
		speakers.push({
			name: faker.person.fullName(),
			description: faker.person.jobTitle(),
			imageUrl: faker.image.personPortrait(),
			projectId: projects[i % projects.length].id,
		});
	}
	console.log("🌱 Semeando palestrantes...");
	const inserted = await db
		.insert(schema.speaker)
		.values(speakers)
		.returning();
	console.log("✅ Palestrantes inseridos!");
	return inserted;
}

async function seedTags(projects: any[]) {
	const namesAndColors: Array<[string, string]> = [
		["Hardware", "#f97316"],
		["Software", "#3b82f6"],
		["Keynotes", "#a855f7"],
		["Workshops", "#22c55e"],
		["Redes", "#06b6d4"],
	];
	const rows: (typeof schema.tag.$inferInsert)[] = [];
	for (const project of projects) {
		for (const [name, color] of namesAndColors.slice(
			0,
			3 + Math.floor(Math.random() * 3),
		)) {
			rows.push({ projectId: project.id, name, color });
		}
	}
	console.log("🌱 Semeando trilhas...");
	const inserted = await db.insert(schema.tag).values(rows).returning();
	console.log("✅ Trilhas inseridas!");
	return inserted;
}

async function seedActivities(projects: any[], speakers: any[], tags: any[]) {
	const activities: (typeof schema.activity.$inferInsert)[] = [];
	const randomAmount = Math.floor(Math.random() * 100) + 50; // Entre 50 e 150 atividades
	for (let i = 0; i < randomAmount; i++) {
		activities.push({
			name: faker.lorem.words(3),
			description: faker.lorem.sentence(),
			audience: "internal",
			category: "lecture",
			participantsLimit: faker.number.int({ min: 10, max: 100 }),
			tolerance: faker.number.int({ min: 0, max: 20 }),
			workload: faker.number.int({ min: 1, max: 60 }),
			allowOverlap: false,
			projectId: projects[i % projects.length].id,
			createdAt: faker.date.past(),
		});
	}
	console.log("🌱 Semeando atividades...");
	const inserted = await db
		.insert(schema.activity)
		.values(activities)
		.returning();
	console.log("✅ Atividades inseridas!");

	// Uma sessão por atividade; a cada 3 atividades, uma segunda sessão no dia seguinte
	const sessions: (typeof schema.activitySession.$inferInsert)[] = [];
	inserted.forEach((activity, i) => {
		const start = faker.date.soon();
		const end = new Date(
			start.getTime() +
				faker.number.int({ min: 1, max: 4 }) * 60 * 60 * 1000,
		);
		sessions.push({
			activityId: activity.id,
			startsAt: start,
			endsAt: end,
		});
		if (i % 3 === 0) {
			const secondStart = new Date(start);
			secondStart.setDate(secondStart.getDate() + 1);
			const secondEnd = new Date(end);
			secondEnd.setDate(secondEnd.getDate() + 1);
			sessions.push({
				activityId: activity.id,
				startsAt: secondStart,
				endsAt: secondEnd,
			});
		}
	});
	console.log("🌱 Semeando sessões...");
	const insertedSessions = await db
		.insert(schema.activitySession)
		.values(sessions)
		.returning();
	console.log("✅ Sessões inseridas!");

	// 0-2 trilhas aleatórias do mesmo projeto por atividade
	const tagsByProject = new Map<string, any[]>();
	for (const tag of tags) {
		const list = tagsByProject.get(tag.projectId) ?? [];
		list.push(tag);
		tagsByProject.set(tag.projectId, list);
	}
	const tagLinks: (typeof schema.tagOnActivity.$inferInsert)[] = [];
	for (const activity of inserted) {
		const projectTags = tagsByProject.get(activity.projectId) ?? [];
		const shuffled = [...projectTags].sort(() => Math.random() - 0.5);
		for (const tag of shuffled.slice(0, Math.floor(Math.random() * 3))) {
			tagLinks.push({ activityId: activity.id, tagId: tag.id });
		}
	}
	if (tagLinks.length > 0) {
		console.log("🌱 Semeando trilhas em atividades...");
		await db.insert(schema.tagOnActivity).values(tagLinks);
		console.log("✅ Trilhas em atividades inseridas!");
	}
	return { activities: inserted, sessions: insertedSessions };
}

async function seedParticipantOnActivity(
	participants: any[],
	activities: any[],
	sessions: any[],
) {
	const data: (typeof schema.participantOnActivity.$inferInsert)[] = [];
	for (let i = 0; i < activities.length; i++) {
		const shuffledParticipants = [...participants].sort(
			() => Math.random() - 0.5,
		);
		const participantCount = Math.floor(
			Math.random() *
				Math.min(participants.length / 2, participants.length),
		);
		for (let j = 0; j < participantCount; j++) {
			data.push({
				participantId: shuffledParticipants[j].id,
				activityId: activities[i].id,
				subscribedAt: faker.date.past(),
			});
		}
	}
	console.log("🌱 Semeando participantes em atividades...");
	await db.insert(schema.participantOnActivity).values(data);
	console.log("✅ Participantes em atividades inseridos!");

	// Presenças aleatórias em sessões para os inscritos
	const sessionsByActivity = new Map<string, any[]>();
	for (const session of sessions) {
		const list = sessionsByActivity.get(session.activityId) ?? [];
		list.push(session);
		sessionsByActivity.set(session.activityId, list);
	}
	const attendances: (typeof schema.sessionAttendance.$inferInsert)[] = [];
	for (const row of data) {
		for (const session of sessionsByActivity.get(row.activityId) ?? []) {
			if (Math.random() > 0.5) {
				attendances.push({
					sessionId: session.id,
					participantId: row.participantId,
					joinedAt: faker.date.past(),
				});
			}
		}
	}
	if (attendances.length > 0) {
		console.log("🌱 Semeando presenças em sessões...");
		await db.insert(schema.sessionAttendance).values(attendances);
		console.log("✅ Presenças em sessões inseridas!");
	}
}

/* async function seedCertificates(
	participants: any[],
	activities: any[],
	projects: any[],
) {
	const templates = await db.query.template.findMany();
	if (!templates.length) {
		console.log(
			"⚠️ Nenhum template encontrado. Pule o seed de certificados.",
		);
		return;
	}
	const data: (typeof schema.certificate.$inferInsert)[] = [];
	for (let i = 0; i < 5; i++) {
		data.push({
			participantId: participants[i % participants.length].id,
			activityId: activities[i % activities.length].id,
			projectId: projects[i % projects.length].id,
			templateId: templates[0].id,
			issuedAt: faker.date.recent(),
		});
	}
	console.log("🌱 Semeando certificados...");
	await db.insert(schema.certificate).values(data);
	console.log("✅ Certificados inseridos!");
} */

export async function seed() {
	const users = await seedUsers();
	const projects = await seedProjects(users);
	const participants = await seedParticipants(users, projects);
	const speakers = await seedSpeakers(projects);
	const tags = await seedTags(projects);
	const { activities, sessions } = await seedActivities(
		projects,
		speakers,
		tags,
	);
	await seedParticipantOnActivity(participants, activities, sessions);
	// await seedCertificates(participants, activities, projects);
}

seed().catch((error) => {
	console.error("❌ Erro ao semear o banco de dados:", error);
	process.exit(1);
});
