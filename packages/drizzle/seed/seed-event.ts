import { eq } from "drizzle-orm";

import {
	DEFAULT_GAMIFICATION_CONFIG,
	isSessionCompleted,
	sessionHours,
	sessionPoints,
} from "../gamification";
import * as schema from "../schema";
import {
	dayKey,
	eventDays,
	eventTimeZone,
	toWallTime,
	zonedInstant,
} from "../time";
import {
	buildActivity,
	buildActivitySession,
	buildParticipant,
	buildProject,
	buildSpeaker,
	TAGS,
} from "./factories";
import { insertNotificationFixtures } from "./notification-fixtures";
import {
	buildAnswerRows,
	buildRegistrationAnswers,
	ACTIVITY_FORM_FIELDS,
	buildRegistrationForm,
} from "./registration-form";
import { addDays, addMinutes, insertInChunks, type SeedDb } from "./utils";

import type { Faker } from "@faker-js/faker";

// As inscrições seguem a ordem das atividades no perfil: quem já está em uma
// atividade, como participante ou monitor, não entra nas seguintes que cruzam
// o mesmo horário, a menos que uma das duas permita sobreposição
export interface ActivitySpec {
	name?: string;
	// `null` = sem limite; omitido = limite aleatório
	participantsLimit?: number | null;
	// Omitido = uma sessão, às vezes duas em dias seguidos
	sessions?: number;
	// Omitido = dia, início entre 8h e 18h e duração de 1 a 3h aleatórios
	slot?: { day: number; startHour: number; hours: number };
	// Como no app: não conflita com nenhuma outra atividade
	allowOverlap?: boolean;
	// Inscritos com papel `participant`, sempre limitado às vagas
	enrolled?: number | "all" | "random";
	monitors?: number | "all";
	// Lota a atividade e põe gente na fila; os `offered` primeiros já têm
	// vaga oferecida. Só vale para atividades que ainda não começaram.
	waitlist?: { waiting: number; offered?: number };
	// Formulário próprio (ACTIVITY_FORM_FIELDS), sem respostas semeadas
	form?: boolean;
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
	/** Liga a gamificação e (opcionalmente) o checkout neste cenário. */
	gamification?: { enabled?: boolean; checkout?: boolean };
}

type Session = ReturnType<typeof buildActivitySession>;

export async function seedEvent(
	db: SeedDb,
	faker: Faker,
	params: {
		index: number;
		spec: EventSpec;
		users: { id: string; email: string }[];
		ownerId: string;
		refDate: Date;
		/** Cria linhas fictícias de notificação (dev). Default: false. */
		notifications?: boolean;
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

	const gamification = spec.gamification
		? {
				...DEFAULT_GAMIFICATION_CONFIG,
				enabled: spec.gamification.enabled ?? true,
				sessions: {
					...DEFAULT_GAMIFICATION_CONFIG.sessions,
					checkoutEnabled: spec.gamification.checkout ?? false,
				},
			}
		: undefined;

	const project = buildProject(
		faker,
		{ index: params.index, ownerId: params.ownerId, startDate, endDate },
		{
			...(spec.name && { name: spec.name }),
			...(spec.url && { url: spec.url }),
			...(gamification && {
				gamification,
				profilesEnabled: true,
			}),
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

	// Inscrições espalhadas pela janela do formulário publicado (até 30
	// dias antes do evento), com horários variados dentro do dia: curva de
	// crescimento no dashboard, em vez de tudo no instante do seed. Termina
	// na data de referência (meia-noite) ou no fim do evento, o que vier
	// primeiro — depois de encerrado, não há inscrição.
	const publishedAt = addDays(startDate, -30);
	const registrationsUntil = new Date(
		Math.min(refDate.getTime(), endDate.getTime()),
	);
	const registrationsFrom = new Date(
		Math.min(
			Math.max(
				publishedAt.getTime(),
				registrationsUntil.getTime() - 30 * 24 * 60 * 60 * 1000,
			),
			registrationsUntil.getTime() - 60 * 60 * 1000,
		),
	);

	// Densidade crescente: 1 - u² empurra as inscrições para perto do
	// refDate (rampa de crescimento), mantendo horários aleatórios no dia
	const registrationAt = () => {
		const u = faker.number.float({ min: 0, max: 1 });
		const position = 1 - u * u;
		return new Date(
			registrationsFrom.getTime() +
				position *
					(registrationsUntil.getTime() -
						registrationsFrom.getTime()),
		);
	};

	const participants = eventUsers.map((user) =>
		buildParticipant(
			faker,
			{ userId: user.id, projectId: project.id },
			{ joinedAt: registrationAt() },
		),
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
				// Respostas no instante da própria inscrição
				answeredAt: participant.joinedAt,
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

	// Ensure ema2@ic.ufal.br is a contributor (moderator) of this seeded project.
	let contributorUser = await db.query.user.findFirst({
		where: eq(schema.user.email, "ema2@ic.ufal.br"),
		columns: { id: true },
	});
	if (!contributorUser) {
		const [created] = await db
			.insert(schema.user)
			.values({
				name: "Ema 2",
				email: "ema2@ic.ufal.br",
				emailVerified: true,
				publicEmail: "ema2@ic.ufal.br",
			})
			.returning({ id: schema.user.id });
		contributorUser = created;
	}
	if (contributorUser && contributorUser.id !== params.ownerId) {
		await db
			.insert(schema.projectModerator)
			.values({
				id: faker.string.uuid(),
				projectId: project.id,
				userId: contributorUser.id,
			})
			.onConflictDoNothing();
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
		const { day, startHour, hours } = activitySpec.slot ?? {
			day: faker.number.int({ min: 0, max: spec.durationDays - 1 }),
			startHour: faker.number.int({ min: 8, max: 18 }),
			hours: faker.number.int({ min: 1, max: 3 }),
		};
		const startsAt = addMinutes(addDays(startDate, day), startHour * 60);
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
				...(activitySpec.allowOverlap && { allowOverlap: true }),
				// A data de referência é meia-noite: com 48h, a oferta semeada
				// ainda vale no dia em que o seed roda
				...(activitySpec.waitlist?.offered && {
					waitlistOfferHours: 48,
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

	// Formulário próprio, respondido ao se inscrever na atividade
	for (const [i, activitySpec] of spec.activities.entries()) {
		if (!activitySpec.form) continue;
		const activityForm = buildRegistrationForm(faker, {
			projectId: project.id,
			activityId: activities[i]!.id,
			createdBy: params.ownerId,
			publishedAt,
			title: "Inscrição na atividade",
			fields: ACTIVITY_FORM_FIELDS,
		});
		await db.insert(schema.formVersion).values(activityForm.version);
		await db.insert(schema.formSection).values(activityForm.section);
		await db.insert(schema.formField).values(activityForm.fields);
	}

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

	// Sessões que ocupam o horário de cada participante
	const busy = new Map<string, Session[]>();
	const built = activities.map((activity, i) =>
		buildEnrollments(faker, {
			activity,
			sessions: sessions.filter((s) => s.activityId === activity.id),
			spec: spec.activities[i]!,
			participants,
			monitorPool,
			busy,
			refDate,
		}),
	);
	const enrollments = built.flatMap((b) => b.enrollments);
	await insertInChunks(db, schema.participantOnActivity, enrollments);
	const waitlist = built.flatMap((b) => b.waitlist);
	await insertInChunks(db, schema.activityWaitlist, waitlist);
	await insertInChunks(
		db,
		schema.activityWaitlistEvent,
		waitlist.flatMap((entry) => [
			{
				activityId: entry.activityId,
				participantId: entry.participantId,
				type: "joined" as const,
				createdAt: entry.joinedAt,
			},
			...(entry.offeredAt
				? [
						{
							activityId: entry.activityId,
							participantId: entry.participantId,
							type: "offered" as const,
							createdAt: entry.offeredAt,
						},
					]
				: []),
		]),
	);

	const checkout = Boolean(gamification?.sessions.checkoutEnabled);
	const attendances = buildAttendances(faker, {
		activities,
		sessions,
		enrollments,
		refDate,
		checkout,
	});
	await insertInChunks(db, schema.sessionAttendance, attendances);

	if (gamification?.enabled) {
		await seedGamificationData(db, faker, {
			project,
			participants,
			sessions,
			enrollments,
			attendances,
			startDate,
			endDate,
			refDate,
			config: gamification,
		});
	}

	let notifications = 0;
	if (params.notifications) {
		const [owner] = await db
			.select({ email: schema.user.email })
			.from(schema.user)
			.where(eq(schema.user.id, params.ownerId));
		notifications = await insertNotificationFixtures(db, {
			projectId: project.id,
			participants: participants.map((participant, index) => ({
				id: participant.id,
				email: eventUsers[index]!.email,
			})),
			enrollments: enrollments.map((enrollment) => ({
				activityId: enrollment.activityId,
				participantId: enrollment.participantId,
				subscribedAt: enrollment.subscribedAt,
			})),
			ownerEmail: owner?.email ?? null,
			refDate,
		});
	}

	return {
		project,
		participants: participants.length,
		activities: activities.length,
		sessions: sessions.length,
		enrollments: enrollments.length,
		waitlist: waitlist.length,
		attendances: attendances.length,
		notifications,
	};
}

/**
 * Cenário de gamificação: check-ins, pontos, adesivos e ranking coerentes
 * com o que o app geraria. Só roda quando o EventSpec pede, para não inflar
 * os seeds normais.
 */
async function seedGamificationData(
	db: SeedDb,
	faker: Faker,
	params: {
		project: { id: string; startDate: Date; endDate: Date };
		participants: { id: string }[];
		sessions: Session[];
		enrollments: {
			participantId: string;
			activityId: string;
			subscribedAt: Date;
		}[];
		attendances: {
			sessionId: string;
			participantId: string;
			joinedAt: Date;
			leftAt?: Date;
		}[];
		startDate: Date;
		endDate: Date;
		refDate: Date;
		config: typeof DEFAULT_GAMIFICATION_CONFIG;
	},
) {
	const { config, project } = params;
	const timeZone = eventTimeZone(project);
	const today = dayKey(params.refDate, timeZone);
	const dayKeys = eventDays(params).filter((day) => day <= today);
	const dayDates = dayKeys.map((key) => ({
		key,
		at: zonedInstant(key, "09:00", timeZone),
	}));

	const checkins: Array<typeof schema.participantCheckin.$inferInsert> = [];
	const checkinDays = new Map<string, Set<string>>();
	const firstCheckin = new Set<string>();

	for (const participant of params.participants) {
		const present = dayDates.filter(
			(_, index) =>
				index === 0 || faker.datatype.boolean({ probability: 0.55 }),
		);
		for (const day of present) {
			checkins.push({
				projectId: project.id,
				participantId: participant.id,
				day: day.key,
				checkedInAt: addMinutes(
					day.at,
					faker.number.int({ min: -20, max: 20 }),
				),
			});
			firstCheckin.add(participant.id);
			const days = checkinDays.get(participant.id) ?? new Set<string>();
			days.add(day.key);
			checkinDays.set(participant.id, days);
		}
	}

	const pointEvents: Array<typeof schema.participantPointEvent.$inferInsert> =
		[];
	const totals = new Map<string, number>();
	const stats = new Map<
		string,
		{
			sessions: Set<string>;
			hours: number;
			early: number;
			completed: number;
		}
	>();

	function award(
		participantId: string,
		source: typeof schema.participantPointEvent.$inferInsert.source,
		dedupeKey: string,
		points: number,
		createdAt: Date,
	) {
		pointEvents.push({
			projectId: project.id,
			participantId,
			source,
			dedupeKey,
			points,
			createdAt,
		});
		totals.set(participantId, (totals.get(participantId) ?? 0) + points);
	}

	for (const checkin of checkins) {
		const participantId = checkin.participantId;
		const day = checkin.day;
		if (!firstCheckin.has(participantId)) continue;
		firstCheckin.delete(participantId);
		award(
			participantId,
			"checkin",
			`checkin:${participantId}`,
			config.presence.firstCheckinPoints,
			checkin.checkedInAt as Date,
		);
		if (config.presence.dailyEnabled) {
			award(
				participantId,
				"daily",
				`daily:${participantId}:${day}`,
				config.presence.dailyPoints,
				checkin.checkedInAt as Date,
			);
		}
	}
	// Check-ins depois do primeiro também rendem o ponto diário.
	for (const checkin of checkins) {
		const participantId = checkin.participantId;
		const key = `daily:${participantId}:${checkin.day}`;
		if (
			config.presence.dailyEnabled &&
			!pointEvents.some((event) => event.dedupeKey === key)
		) {
			award(
				participantId,
				"daily",
				key,
				config.presence.dailyPoints,
				checkin.checkedInAt as Date,
			);
		}
	}

	const sessionById = new Map(
		params.sessions.map((session) => [session.id, session]),
	);
	const startHour = (date: Date) =>
		Number(toWallTime(date, timeZone).time.slice(0, 2));

	for (const attendance of params.attendances) {
		const session = sessionById.get(attendance.sessionId);
		if (!session) continue;
		const participantStats = stats.get(attendance.participantId) ?? {
			sessions: new Set<string>(),
			hours: 0,
			early: 0,
			completed: 0,
		};
		participantStats.sessions.add(session.id);
		participantStats.hours += sessionHours(
			session.startsAt,
			session.endsAt,
		);
		if (startHour(session.startsAt) < 9) participantStats.early += 1;
		if (
			isSessionCompleted({
				startsAt: session.startsAt,
				endsAt: session.endsAt,
				joinedAt: attendance.joinedAt,
				leftAt: attendance.leftAt ?? null,
				graceMinutes: config.sessions.completionGraceMinutes,
			})
		) {
			participantStats.completed += 1;
		}
		stats.set(attendance.participantId, participantStats);

		award(
			attendance.participantId,
			"session",
			`session:${attendance.participantId}:${session.id}`,
			sessionPoints({
				startsAt: session.startsAt,
				endsAt: session.endsAt,
				perHour: config.sessions.perHour,
			}),
			session.endsAt,
		);
		if (
			config.sessions.checkoutEnabled &&
			attendance.leftAt &&
			isSessionCompleted({
				startsAt: session.startsAt,
				endsAt: session.endsAt,
				joinedAt: attendance.joinedAt,
				leftAt: attendance.leftAt,
				graceMinutes: config.sessions.completionGraceMinutes,
			})
		) {
			award(
				attendance.participantId,
				"completion",
				`completion:${attendance.participantId}:${session.id}`,
				config.sessions.completionBonus,
				attendance.leftAt,
			);
		}
	}

	for (const enrollment of params.enrollments) {
		award(
			enrollment.participantId,
			"enrollment",
			`enroll:${enrollment.participantId}:${enrollment.activityId}`,
			config.enrollmentPoints,
			enrollment.subscribedAt,
		);
	}

	await insertInChunks(db, schema.participantCheckin, checkins);
	await insertInChunks(db, schema.participantPointEvent, pointEvents);
	await insertInChunks(
		db,
		schema.participantPoints,
		[...totals.entries()].map(([participantId, total]) => ({
			participantId,
			projectId: project.id,
			total,
			updatedAt: params.refDate,
		})),
	);

	const ranking = [...totals.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([participantId], index) => ({ participantId, rank: index + 1 }));
	const rankByParticipant = new Map(
		ranking.map((row) => [row.participantId, row.rank]),
	);
	const eventDayCount = dayKeys.length;
	const stickers: Array<typeof schema.participantSticker.$inferInsert> = [];

	for (const participant of params.participants) {
		const days = checkinDays.get(participant.id)?.size ?? 0;
		const participantStats = stats.get(participant.id);
		const keys: string[] = [];
		if (days > 0) keys.push("checkin");
		if ((participantStats?.sessions.size ?? 0) >= 3) keys.push("explorer");
		if ((participantStats?.hours ?? 0) >= 8) keys.push("marathon");
		if ((participantStats?.early ?? 0) > 0) keys.push("early-bird");
		if ((rankByParticipant.get(participant.id) ?? 999) <= 10) {
			keys.push("elite");
		}
		if (days >= 3 && eventDayCount >= 3) keys.push("frequent");
		if (eventDayCount >= 2 && days >= eventDayCount) keys.push("everyday");
		if (
			config.sessions.checkoutEnabled &&
			(participantStats?.completed ?? 0) >= 5
		) {
			keys.push("finisher");
		}
		for (const stickerKey of keys) {
			stickers.push({
				projectId: project.id,
				participantId: participant.id,
				stickerKey,
				source: "auto",
				earnedAt: addMinutes(params.startDate, 12 * 60),
			});
		}
	}
	await insertInChunks(db, schema.participantSticker, stickers);
}

function buildEnrollments(
	faker: Faker,
	params: {
		activity: ReturnType<typeof buildActivity>;
		sessions: Session[];
		spec: ActivitySpec;
		participants: { id: string }[];
		monitorPool: { id: string }[];
		busy: Map<string, Session[]>;
		refDate: Date;
	},
) {
	const {
		activity,
		sessions,
		spec,
		participants,
		monitorPool,
		busy,
		refDate,
	} = params;

	// Sobreposição estrita, como na regra do app: atividades em sequência não
	// conflitam, e quem permite sobreposição não conflita com nada
	const isFree = (participant: { id: string }) =>
		activity.allowOverlap ||
		!busy
			.get(participant.id)
			?.some((taken) =>
				sessions.some(
					(session) =>
						taken.startsAt < session.endsAt &&
						session.startsAt < taken.endsAt,
				),
			);

	const freeMonitors = monitorPool.filter(isFree);
	const monitorCount =
		spec.monitors === "all"
			? freeMonitors.length
			: (spec.monitors ??
				faker.number.int({
					min: 0,
					max: Math.min(2, freeMonitors.length),
				}));
	const monitors = faker.helpers.arrayElements(freeMonitors, monitorCount);
	const monitorIds = new Set(monitors.map((monitor) => monitor.id));

	const candidates = participants.filter(
		(participant) => !monitorIds.has(participant.id) && isFree(participant),
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
		Math.min(sessions[0]!.startsAt.getTime(), refDate.getTime()),
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

	// Com fila, as vagas oferecidas saem das inscrições
	const startsAt = sessions[0]!.startsAt;
	const queue = startsAt > refDate ? spec.waitlist : undefined;
	const offered = queue?.offered ?? 0;
	const chosen = faker.helpers.arrayElements(
		candidates,
		queue ? Math.max(0, max - offered) : count,
	);

	const enrollments = [
		...monitors.map((monitor) => row(monitor.id, "monitor")),
		...chosen.map((participant) => row(participant.id, "participant")),
	];
	const queued = queue
		? faker.helpers.arrayElements(
				candidates.filter((c) => !chosen.includes(c)),
				queue.waiting + offered,
			)
		: [];
	// Quem está na fila também ocupa o horário, para poder confirmar. Uma
	// atividade que permite sobreposição não ocupa o horário de ninguém.
	for (const participantId of activity.allowOverlap
		? []
		: [
				...enrollments.map((e) => e.participantId),
				...queued.map((q) => q.id),
			]) {
		busy.set(participantId, [
			...(busy.get(participantId) ?? []),
			...sessions,
		]);
	}

	return {
		enrollments,
		waitlist: queue
			? buildWaitlist(faker, {
					activity,
					startsAt,
					people: queued,
					offered,
					refDate,
				})
			: [],
	};
}

// Fila pela ordem de chegada: os primeiros receberam a oferta na data de referência
function buildWaitlist(
	faker: Faker,
	params: {
		activity: ReturnType<typeof buildActivity>;
		startsAt: Date;
		people: { id: string }[];
		offered: number;
		refDate: Date;
	},
) {
	const { activity, startsAt, offered, refDate } = params;
	const offeredAt = refDate;
	const offerExpiresAt = new Date(
		Math.min(
			addMinutes(offeredAt, activity.waitlistOfferHours * 60).getTime(),
			startsAt.getTime(),
		),
	);
	const joinedAt = params.people
		.map(() =>
			faker.date.between({
				from: addDays(offeredAt, -10),
				to: offeredAt,
			}),
		)
		.sort((a, b) => a.getTime() - b.getTime());

	return params.people.map((person, i) => ({
		id: faker.string.uuid(),
		activityId: activity.id,
		participantId: person.id,
		joinedAt: joinedAt[i]!,
		...(i < offered
			? { status: "offered" as const, offeredAt, offerExpiresAt }
			: { status: "waiting" as const, offeredAt: null }),
	}));
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
		checkout?: boolean;
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
				.map((enrollment) => {
					const joinedAt = addMinutes(
						session.startsAt,
						faker.number.int({
							min: 0,
							max: params.checkout
								? 5
								: (tolerance.get(session.activityId) ?? 15),
						}),
					);
					const leftAt =
						params.checkout &&
						faker.datatype.boolean({ probability: 0.65 })
							? addMinutes(
									session.endsAt,
									-faker.number.int({ min: 0, max: 5 }),
								)
							: undefined;

					return {
						sessionId: session.id,
						participantId: enrollment.participantId,
						joinedAt,
						leftAt,
					};
				}),
		);
}
