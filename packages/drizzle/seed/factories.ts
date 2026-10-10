import { activityAudiences } from "../enum/audience";
import { activityCategories } from "../enum/category";
import { SEED_EMAIL_DOMAIN, SEED_URL_PREFIX, slugify } from "./utils";

import type * as schema from "../schema";
import type { Faker } from "@faker-js/faker";

// Funções puras: geram linhas válidas sem acessar o banco.
// Os ids são gerados aqui para que o resultado seja reproduzível com a mesma semente.

type UserInsert = typeof schema.user.$inferInsert;
type ProjectInsert = typeof schema.project.$inferInsert;
type ParticipantInsert = typeof schema.participant.$inferInsert;
type ActivityInsert = typeof schema.activity.$inferInsert;
type ActivitySessionInsert = typeof schema.activitySession.$inferInsert;
type SpeakerInsert = typeof schema.speaker.$inferInsert;

export const COURSES = [
	"Ciência da Computação",
	"Engenharia de Computação",
	"Sistemas de Informação",
	"Matemática",
	"Física",
	"Química",
	"Engenharia Civil",
	"Arquitetura e Urbanismo",
	"Administração",
	"Direito",
] as const;

export const TAGS = [
	{ name: "Hardware", color: "#f97316" },
	{ name: "Software", color: "#3b82f6" },
	{ name: "Keynotes", color: "#a855f7" },
	{ name: "Workshops", color: "#22c55e" },
	{ name: "Redes", color: "#06b6d4" },
] as const;

export function buildUser(
	faker: Faker,
	index: number,
	overrides: Partial<UserInsert> = {},
) {
	const sex = faker.helpers.arrayElement(["female", "male"] as const);
	const firstName = faker.person.firstName(sex);
	const lastName = faker.person.lastName();
	const email = `${slugify(`${firstName} ${lastName}`, ".")}.${index}@${SEED_EMAIL_DOMAIN}`;

	return {
		id: faker.string.uuid(),
		name: `${firstName} ${lastName}`,
		email,
		emailVerified: true,
		publicEmail: email,
		image_url: faker.image.personPortrait({ sex }),
		...overrides,
	} satisfies UserInsert;
}

export function buildProject(
	faker: Faker,
	params: {
		index: number;
		ownerId: string;
		startDate: Date;
		endDate: Date;
	},
	overrides: Partial<ProjectInsert> = {},
) {
	const name =
		overrides.name ??
		`${faker.helpers.arrayElement(["Semana", "Encontro", "Jornada", "Congresso"])} de ${faker.helpers.arrayElement(COURSES)}`;

	return {
		id: faker.string.uuid(),
		name,
		description: faker.lorem.paragraphs({ min: 2, max: 6 }),
		url: `${SEED_URL_PREFIX}${slugify(name)}-${params.index}`,
		address: faker.location.streetAddress(),
		latitude: faker.location.latitude(),
		longitude: faker.location.longitude(),
		isRegistrationEnabled: true,
		isArchived: false,
		logoUrl: faker.image.urlPicsumPhotos(),
		coverUrl: faker.image.urlPicsumPhotos(),
		thumbnailUrl: faker.image.urlPicsumPhotos(),
		primaryColor: faker.color.rgb({ format: "hex", casing: "lower" }),
		secondaryColor: faker.color.rgb({ format: "hex", casing: "lower" }),
		startDate: params.startDate,
		endDate: params.endDate,
		ownerId: params.ownerId,
		...overrides,
	} satisfies ProjectInsert;
}

export function buildParticipant(
	faker: Faker,
	params: { userId: string; projectId: string },
	overrides: Partial<ParticipantInsert> = {},
) {
	return {
		id: faker.string.uuid(),
		userId: params.userId,
		projectId: params.projectId,
		shortId: faker.string.alphanumeric(10),
		...overrides,
	} satisfies ParticipantInsert;
}

export function buildActivity(
	faker: Faker,
	params: { projectId: string; workload: number },
	overrides: Partial<ActivityInsert> = {},
) {
	return {
		id: faker.string.uuid(),
		name: faker.lorem.words({ min: 2, max: 5 }),
		description: faker.lorem.paragraph(),
		audience: faker.helpers.arrayElement(activityAudiences),
		category: faker.helpers.arrayElement(activityCategories),
		participantsLimit: faker.number.int({ min: 10, max: 100 }),
		tolerance: faker.helpers.arrayElement([0, 10, 15, 20]),
		waitlistOfferHours: 12,
		workload: params.workload,
		projectId: params.projectId,
		...overrides,
	} satisfies ActivityInsert;
}

export function buildActivitySession(
	faker: Faker,
	params: { activityId: string; startsAt: Date; endsAt: Date },
) {
	return {
		id: faker.string.uuid(),
		activityId: params.activityId,
		startsAt: params.startsAt,
		endsAt: params.endsAt,
	} satisfies ActivitySessionInsert;
}

export function buildSpeaker(
	faker: Faker,
	params: { projectId: string },
	overrides: Partial<SpeakerInsert> = {},
) {
	return {
		name: faker.person.fullName(),
		description: faker.person.jobTitle(),
		imageUrl: faker.image.personPortrait(),
		projectId: params.projectId,
		...overrides,
	} satisfies SpeakerInsert;
}
