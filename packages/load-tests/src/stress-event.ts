import { and, eq, like, notInArray } from "@verific/drizzle/orm";
import {
	activity,
	activitySession,
	participant,
	participantOnActivity,
	project,
	user,
} from "@verific/drizzle/schema";
import {
	SEED_EMAIL_DOMAIN,
	STRESS_EVENT,
	type SeedDb,
} from "@verific/drizzle/seed";

// Localiza o evento criado por `pnpm db:seed --profile=stress`
export async function loadStressEvent(db: SeedDb) {
	const event = await db.query.project.findFirst({
		where: eq(project.url, STRESS_EVENT.url),
		columns: { id: true, url: true },
	});
	if (!event) {
		throw new Error(
			`Evento /${STRESS_EVENT.url} não encontrado. Rode antes: pnpm db:seed --profile=stress --reset`,
		);
	}

	const activities = await db
		.select({
			id: activity.id,
			name: activity.name,
			participantsLimit: activity.participantsLimit,
		})
		.from(activity)
		.where(eq(activity.projectId, event.id));

	const byName = (name: string) => {
		const found = activities.find((a) => a.name === name);
		if (!found) throw new Error(`Atividade "${name}" não encontrada.`);
		return found;
	};
	const limit50 = byName(STRESS_EVENT.activities.limit50);
	const spread = Array.from({ length: STRESS_EVENT.spreadCount }, (_, i) =>
		byName(STRESS_EVENT.activities.spread(i + 1)),
	);
	const withForm = byName(STRESS_EVENT.activities.withForm);
	const checkin = byName(STRESS_EVENT.activities.checkin);
	const named = new Set(
		[limit50, ...spread, withForm, checkin].map((a) => a.id),
	);
	const others = activities.filter((a) => !named.has(a.id));

	// O check-in marca presença numa sessão da atividade
	const checkinSession = await db.query.activitySession.findFirst({
		where: eq(activitySession.activityId, checkin.id),
		columns: { id: true },
	});
	if (!checkinSession) {
		throw new Error(`A atividade "${checkin.name}" não tem sessão.`);
	}

	const monitors = await db
		.select({
			userId: participant.userId,
			participantId: participant.id,
			shortId: participant.shortId,
		})
		.from(participantOnActivity)
		.innerJoin(
			participant,
			eq(participant.id, participantOnActivity.participantId),
		)
		.where(
			and(
				eq(participantOnActivity.activityId, checkin.id),
				eq(participantOnActivity.role, "monitor"),
			),
		);
	const monitorIds = monitors.map((m) => m.participantId);

	const enrolled = await db
		.select({
			userId: participant.userId,
			participantId: participant.id,
			shortId: participant.shortId,
		})
		.from(participant)
		.where(
			and(
				eq(participant.projectId, event.id),
				notInArray(participant.id, monitorIds),
			),
		);

	const enrolledUserIds = new Set(
		[...enrolled, ...monitors].map((p) => p.userId),
	);
	const newcomers = (
		await db
			.select({ userId: user.id })
			.from(user)
			// `nome.sobrenome.N@`: exclui o dono fictício (`owner@`)
			.where(like(user.email, `%.%@${SEED_EMAIL_DOMAIN}`))
	).filter((u) => !enrolledUserIds.has(u.userId));

	return {
		event: {
			projectId: event.id,
			url: event.url,
			activities: {
				limit50: limit50.id,
				spread: spread.map((a) => a.id),
				withForm: withForm.id,
				checkin: checkin.id,
				checkinSession: checkinSession.id,
				others: others.map((a) => a.id),
				all: activities.map((a) => a.id),
			},
		},
		monitors,
		enrolled,
		newcomers,
	};
}
