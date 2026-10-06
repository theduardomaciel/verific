import * as schema from "../schema";
import {
	buildActivity,
	buildActivitySession,
	buildParticipant,
	buildProject,
	buildSpeaker,
	TAGS,
} from "./factories";
import {
	buildAnswerRows,
	buildRegistrationAnswers,
	buildRegistrationForm,
} from "./registration-form";
import { addDays, addMinutes, insertInChunks, type SeedDb } from "./utils";

import type { Faker } from "@faker-js/faker";

export interface ActivitySpec {
	name?: string;
	// `null` = sem limite; omitido = limite aleatório
	participantsLimit?: number | null;
	// Omitido = uma sessão, às vezes duas em dias seguidos
	sessions?: number;
	// Inscritos com papel `participant`, sempre limitado às vagas
	enrolled?: number | "all" | "random";
	monitors?: number | "all";
}

export interface EventSpec {
	name?: string;
	url?: string;
	// Relativo à data de referência; negativo = evento em andamento ou passado
	startsInDays: number;
	durationDays: number;
	participants: number;
	// Quantos dos participantes atuam como monitores
	monitors: number;
	moderators: number;
	speakers: number;
	activities: ActivitySpec[];
}

type Session = ReturnType<typeof buildActivitySession>;

export async function seedEvent(
	db: SeedDb,
	faker: Faker,
	params: {
		index: number;
		spec: EventSpec;
		users: { id: string }[];
		ownerId: string;
		refDate: Date;
	},
) {
	const { spec, users, refDate } = params;

	if (spec.participants > users.length) {
		throw new Error(
			`O evento ${params.index} pede ${spec.participants} participantes, mas só há ${users.length} usuários.`,
		);
	}

	const startDate = addDays(refDate, spec.startsInDays);
	const endDate = addDays(startDate, spec.durationDays);

	const project = buildProject(
		faker,
		{ index: params.index, ownerId: params.ownerId, startDate, endDate },
		{
			...(spec.name && { name: spec.name }),
			...(spec.url && { url: spec.url }),
		},
	);
	await db.insert(schema.project).values(project);

	const form = buildRegistrationForm(faker, {
		projectId: project.id,
		createdBy: params.ownerId,
		publishedAt: addDays(startDate, -30),
	});
	await db.insert(schema.formVersion).values(form.version);
	await db.insert(schema.formSection).values(form.section);
	await db.insert(schema.formField).values(form.fields);

	const eventUsers = faker.helpers.arrayElements(users, spec.participants);
	const participants = eventUsers.map((user) =>
		buildParticipant(faker, { userId: user.id, projectId: project.id }),
	);
	await insertInChunks(db, schema.participant, participants);
	await insertInChunks(
		db,
		schema.formAnswer,
		participants.flatMap((participant, i) =>
			buildAnswerRows({
				participantId: participant.id,
				projectId: project.id,
				form,
				answers: buildRegistrationAnswers(faker, i),
			}),
		),
	);

	const monitorPool = participants.slice(0, spec.monitors);

	const moderators = faker.helpers
		.arrayElements(
			users.filter((user) => user.id !== params.ownerId),
			spec.moderators,
		)
		.map((user) => ({
			id: faker.string.uuid(),
			projectId: project.id,
			userId: user.id,
		}));
	if (moderators.length > 0) {
		await db.insert(schema.projectModerator).values(moderators);
	}

	const speakers =
		spec.speakers > 0
			? await db
					.insert(schema.speaker)
					.values(
						Array.from({ length: spec.speakers }, () =>
							buildSpeaker(faker, { projectId: project.id }),
						),
					)
					.returning({ id: schema.speaker.id })
			: [];

	const tags = faker.helpers
		.arrayElements(TAGS, { min: 3, max: TAGS.length })
		.map((tag) => ({
			id: faker.string.uuid(),
			projectId: project.id,
			...tag,
		}));
	await db.insert(schema.tag).values(tags);

	const sessions: Session[] = [];
	const activities = spec.activities.map((activitySpec) => {
		const day = faker.number.int({ min: 0, max: spec.durationDays - 1 });
		const startMinutes = faker.number.int({ min: 8, max: 18 }) * 60;
		const startsAt = addMinutes(addDays(startDate, day), startMinutes);
		const hours = faker.number.int({ min: 1, max: 3 });
		const sessionCount =
			activitySpec.sessions ??
			(faker.datatype.boolean({ probability: 1 / 3 }) ? 2 : 1);

		const activity = buildActivity(
			faker,
			{ projectId: project.id, workload: hours * sessionCount },
			{
				...(activitySpec.name && { name: activitySpec.name }),
				...(activitySpec.participantsLimit !== undefined && {
					participantsLimit: activitySpec.participantsLimit,
				}),
			},
		);
		for (let i = 0; i < sessionCount; i++) {
			const sessionStart = addDays(startsAt, i);
			sessions.push(
				buildActivitySession(faker, {
					activityId: activity.id,
					startsAt: sessionStart,
					endsAt: addMinutes(sessionStart, hours * 60),
				}),
			);
		}
		return activity;
	});
	await insertInChunks(db, schema.activity, activities);
	await insertInChunks(db, schema.activitySession, sessions);

	await insertInChunks(
		db,
		schema.tagOnActivity,
		activities.flatMap((activity) =>
			faker.helpers
				.arrayElements(tags, { min: 0, max: 2 })
				.map((tag) => ({ activityId: activity.id, tagId: tag.id })),
		),
	);

	const speakerLinks = speakers.length
		? activities.flatMap((activity) =>
				faker.helpers
					.arrayElements(speakers, { min: 1, max: 2 })
					.map((speaker) => ({
						activityId: activity.id,
						speakerId: speaker.id,
					})),
			)
		: [];
	await insertInChunks(db, schema.speakerOnActivity, speakerLinks);

	const enrollments = activities.flatMap((activity, i) =>
		buildEnrollments(faker, {
			activity,
			firstSession: sessions.find((s) => s.activityId === activity.id)!,
			spec: spec.activities[i]!,
			participants,
			monitorPool,
			refDate,
		}),
	);
	await insertInChunks(db, schema.participantOnActivity, enrollments);

	const attendances = buildAttendances(faker, {
		activities,
		sessions,
		enrollments,
		refDate,
	});
	await insertInChunks(db, schema.sessionAttendance, attendances);

	return {
		project,
		participants: participants.length,
		activities: activities.length,
		sessions: sessions.length,
		enrollments: enrollments.length,
		attendances: attendances.length,
	};
}

function buildEnrollments(
	faker: Faker,
	params: {
		activity: ReturnType<typeof buildActivity>;
		firstSession: Session;
		spec: ActivitySpec;
		participants: { id: string }[];
		monitorPool: { id: string }[];
		refDate: Date;
	},
) {
	const { activity, firstSession, spec, participants, monitorPool, refDate } =
		params;

	const monitorCount =
		spec.monitors === "all"
			? monitorPool.length
			: (spec.monitors ??
				faker.number.int({
					min: 0,
					max: Math.min(2, monitorPool.length),
				}));
	const monitors = faker.helpers.arrayElements(monitorPool, monitorCount);
	const monitorIds = new Set(monitors.map((monitor) => monitor.id));

	const candidates = participants.filter(
		(participant) => !monitorIds.has(participant.id),
	);
	const limit = activity.participantsLimit ?? null;
	const max = Math.min(candidates.length, limit ?? candidates.length);

	const requested = spec.enrolled ?? "random";
	const count =
		requested === "all"
			? max
			: requested === "random"
				? faker.number.int({
						min: 0,
						max: Math.min(
							max,
							limit ?? Math.floor(candidates.length / 2),
						),
					})
				: Math.min(requested, max);

	// A inscrição acontece antes da atividade e nunca depois da data de referência
	const subscribedUntil = new Date(
		Math.min(firstSession.startsAt.getTime(), refDate.getTime()),
	);

	const row = (participantId: string, role: "participant" | "monitor") => ({
		participantId,
		activityId: activity.id,
		role,
		subscribedAt: faker.date.between({
			from: addDays(subscribedUntil, -30),
			to: subscribedUntil,
		}),
	});

	return [
		...monitors.map((monitor) => row(monitor.id, "monitor")),
		...faker.helpers
			.arrayElements(candidates, count)
			.map((participant) => row(participant.id, "participant")),
	];
}

// Presença em ~70% das sessões que já começaram, dentro da tolerância
function buildAttendances(
	faker: Faker,
	params: {
		activities: ReturnType<typeof buildActivity>[];
		sessions: Session[];
		enrollments: {
			participantId: string;
			activityId: string;
			role: string;
		}[];
		refDate: Date;
	},
) {
	const tolerance = new Map(
		params.activities.map((activity) => [activity.id, activity.tolerance]),
	);

	return params.sessions
		.filter((session) => session.startsAt < params.refDate)
		.flatMap((session) =>
			params.enrollments
				.filter(
					(enrollment) =>
						enrollment.activityId === session.activityId &&
						enrollment.role === "participant" &&
						faker.datatype.boolean({ probability: 0.7 }),
				)
				.map((enrollment) => ({
					sessionId: session.id,
					participantId: enrollment.participantId,
					joinedAt: addMinutes(
						session.startsAt,
						faker.number.int({
							min: 0,
							max: tolerance.get(session.activityId) ?? 15,
						}),
					),
				})),
		);
}
