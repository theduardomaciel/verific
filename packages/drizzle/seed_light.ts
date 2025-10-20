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
	for (let i = 0; i < 10; i++) {
		const sex = Math.random() > 0.5 ? "male" : "female";

		users.push({
			name: faker.person.fullName({ sex: sex }),
			email: faker.internet.email(),
			public_email: faker.internet.email(),
			emailVerified: faker.date.past(),
			image_url: faker.image.personPortrait({ sex: sex }),
		});
	}
	console.log("🌱 Semeando usuários...");
	const inserted = await db.insert(schema.user).values(users).returning();
	console.log("✅ Usuários inseridos!");
	return inserted;
}

async function seedProjects(users: any[]) {
	const projects: (typeof schema.project.$inferInsert)[] = [];
	for (let i = 0; i < 3; i++) {
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
			isResearchEnabled: faker.datatype.boolean(),
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
			course: "Ciência Da Computação",
			registrationId: faker.string.numeric({ length: 8 }),
			period: "1",
			joinedAt: faker.date.past(),
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
	for (let i = 0; i < 15; i++) {
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

async function seedActivities(projects: any[], speakers: any[]) {
	const activities: (typeof schema.activity.$inferInsert)[] = [];
	for (let i = 0; i < 40; i++) {
		activities.push({
			name: faker.lorem.words(3),
			description: faker.lorem.sentence(),
			dateFrom: faker.date.soon(),
			dateTo: faker.date.soon({ days: 10 }),
			audience: "internal",
			category: "lecture",
			participantsLimit: faker.number.int({ min: 10, max: 100 }),
			tolerance: faker.number.int({ min: 0, max: 20 }),
			workload: faker.number.int({ min: 1, max: 60 }),
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
	return inserted;
}

async function seedParticipantOnActivity(
	participants: any[],
	activities: any[],
) {
	const data: (typeof schema.participantOnActivity.$inferInsert)[] = [];
	for (let i = 0; i < activities.length; i++) {
		const shuffledParticipants = [...participants].sort(
			() => Math.random() - 0.5,
		);
		const participantCount = Math.floor(
			Math.random() * Math.min(15, participants.length),
		);
		for (let j = 0; j < participantCount; j++) {
			data.push({
				participantId: shuffledParticipants[j].id,
				activityId: activities[i].id,
				subscribedAt: faker.date.past(),
				joinedAt: Math.random() > 0.5 ? faker.date.past() : null,
				leftAt: null,
			});
		}
	}
	console.log("🌱 Semeando participantes em atividades...");
	await db.insert(schema.participantOnActivity).values(data);
	console.log("✅ Participantes em atividades inseridos!");
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
	const activities = await seedActivities(projects, speakers);
	await seedParticipantOnActivity(participants, activities);
	// await seedCertificates(participants, activities, projects);
}

seed().catch((error) => {
	console.error("❌ Erro ao semear o banco de dados:", error);
	process.exit(1);
});
