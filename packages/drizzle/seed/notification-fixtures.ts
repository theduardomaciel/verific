import { eq } from "drizzle-orm";

import * as schema from "../schema";

import type { SeedDb } from "./utils";

type NotificationInsert = typeof schema.notification.$inferInsert;

/**
 * Prefixo reconhecível das linhas fictícias. Usado só para diagnóstico; o
 * reset não precisa delas porque saem por cascade junto do evento.
 */
export const SEED_NOTIFICATION_PREFIX = "seed-notification";

/** Placeholder de sha256 só para preencher a coluna de auditoria (não é lida). */
const PLACEHOLDER_PROPS_HASH = "0".repeat(64);

export interface NotificationFixtureInput {
	projectId: string;
	/** Inscritos do evento com o e-mail do destinatário. */
	participants: Array<{ id: string; email: string }>;
	/** Inscrições em atividades (base dos e-mails de atividade). */
	enrollments: Array<{
		activityId: string;
		participantId: string;
		subscribedAt: Date;
	}>;
	/** E-mail do organizador, para a linha de aviso de limite. */
	ownerEmail?: string | null;
	/** Data de referência do seed (meia-noite no fuso padrão). */
	refDate: Date;
	/** Relógio injetável nos testes; default = agora. */
	now?: Date;
}

function at<T>(values: T[], index: number): T {
	return values[index % values.length]!;
}

function dayKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/**
 * Constrói um conjunto fixo de linhas cobrindo todos os estados da página de
 * e-mails (sent, pending, sending fresco, travada, failed, blocked_quota,
 * skipped e o aviso de limite do organizador), com `entityRefs` reais para
 * que o reprocessamento funcione. Função pura: mesmos insumos, mesmas linhas.
 */
export function buildNotificationFixtures(
	input: NotificationFixtureInput,
): NotificationInsert[] {
	const { projectId, participants, enrollments, ownerEmail, refDate } = input;
	if (participants.length === 0) return [];

	const now = input.now ?? new Date();
	const key = (slug: string) =>
		`${SEED_NOTIFICATION_PREFIX}:${projectId}:${slug}`;
	const at3 = (index: number) => at(participants, index);
	const created = (minutesAgo: number) =>
		new Date(refDate.getTime() - minutesAgo * 60_000);
	const momentsAgo = (minutesAgo: number) =>
		new Date(now.getTime() - minutesAgo * 60_000);

	const rows: NotificationInsert[] = [
		// Enviada: confirmação de inscrição (conta na cota das últimas 24h).
		{
			type: "event_registration_confirmation",
			idempotencyKey: key("sent-confirmation"),
			eventId: projectId,
			recipientEmail: at3(0).email,
			subject: "Inscrição confirmada",
			templateVersion: "seed-v1",
			status: "sent",
			attempts: 1,
			provider: "resend",
			providerMessageId: "seed-msg-confirmation",
			propsHash: PLACEHOLDER_PROPS_HASH,
			entityRefs: { registrationId: at3(0).id },
			createdAt: created(180),
			updatedAt: created(170),
			sentAt: created(170),
		},
		// Pendente: na fila, aguardando envio.
		{
			type: "event_registration_confirmation",
			idempotencyKey: key("pending-confirmation"),
			eventId: projectId,
			recipientEmail: at3(1).email,
			status: "pending",
			attempts: 0,
			entityRefs: { registrationId: at3(1).id },
			createdAt: created(120),
			updatedAt: created(120),
		},
		// Falha permanente após as tentativas.
		{
			type: "event_registration_confirmation",
			idempotencyKey: key("failed-confirmation"),
			eventId: projectId,
			recipientEmail: at3(2).email,
			subject: "Inscrição confirmada",
			templateVersion: "seed-v1",
			status: "failed",
			attempts: 3,
			lastError:
				"validation_error: endereço inválido ou caixa cheia (bounce permanente)",
			lastErrorRetryable: false,
			provider: "resend",
			propsHash: PLACEHOLDER_PROPS_HASH,
			entityRefs: { registrationId: at3(2).id },
			createdAt: created(240),
			updatedAt: created(150),
		},
		// Bloqueada pelo limite diário de envios.
		{
			type: "event_registration_confirmation",
			idempotencyKey: key("blocked-confirmation"),
			eventId: projectId,
			recipientEmail: at3(3).email,
			status: "blocked_quota",
			attempts: 1,
			lastError: "daily_limit_reached: 500/500 sends in the last 24h",
			lastErrorRetryable: false,
			provider: "resend",
			entityRefs: { registrationId: at3(3).id },
			createdAt: created(200),
			updatedAt: created(190),
		},
		// Ignorada: tipo desativado nas configurações do evento.
		{
			type: "event_registration_removed",
			idempotencyKey: key("skipped-disabled"),
			eventId: projectId,
			recipientEmail: at3(4).email,
			status: "skipped",
			skipReason: "disabled_by_event",
			attempts: 0,
			entityRefs: { registrationId: at3(4).id },
			createdAt: created(90),
			updatedAt: created(90),
		},
		// Enviando agora (não é travada).
		{
			type: "event_registration_confirmation",
			idempotencyKey: key("sending-fresh"),
			eventId: projectId,
			recipientEmail: at3(5).email,
			status: "sending",
			attempts: 1,
			entityRefs: { registrationId: at3(5).id },
			createdAt: momentsAgo(1),
			updatedAt: momentsAgo(0.5),
		},
		// Travada: claim antigo, sem conclusão (processo morto).
		{
			type: "event_registration_confirmation",
			idempotencyKey: key("sending-stuck"),
			eventId: projectId,
			recipientEmail: at3(6).email,
			status: "sending",
			attempts: 1,
			provider: "resend",
			entityRefs: { registrationId: at3(6).id },
			createdAt: momentsAgo(25),
			// > 10 min => a página marca como "Travada".
			updatedAt: momentsAgo(15),
		},
	];

	// Linhas de atividade só quando há inscrição real para referenciar.
	if (enrollments.length > 0) {
		const emailById = new Map(
			participants.map((participant) => [
				participant.id,
				participant.email,
			]),
		);
		const first = enrollments[0]!;
		const second = enrollments[1] ?? first;

		rows.push(
			{
				type: "activity_enrollment_confirmed",
				idempotencyKey: key("sent-enrollment"),
				eventId: projectId,
				recipientEmail:
					emailById.get(first.participantId) ?? at3(0).email,
				subject: "Inscrição na atividade confirmada",
				templateVersion: "seed-v1",
				status: "sent",
				attempts: 1,
				provider: "resend",
				providerMessageId: "seed-msg-enrollment",
				propsHash: PLACEHOLDER_PROPS_HASH,
				entityRefs: {
					activityId: first.activityId,
					participantId: first.participantId,
					subscribedAt: first.subscribedAt.toISOString(),
				},
				createdAt: created(100),
				updatedAt: created(95),
				sentAt: created(95),
			},
			{
				type: "activity_enrollment_confirmed",
				idempotencyKey: key("skipped-state-changed"),
				eventId: projectId,
				recipientEmail:
					emailById.get(second.participantId) ?? at3(1).email,
				status: "skipped",
				skipReason: "state_changed",
				lastError: "skip: state_changed",
				lastErrorRetryable: false,
				attempts: 0,
				entityRefs: {
					activityId: second.activityId,
					participantId: second.participantId,
					subscribedAt: second.subscribedAt.toISOString(),
				},
				createdAt: created(80),
				updatedAt: created(80),
			},
		);
	}

	// Aviso de limite para o organizador (aparece como linha "organizer").
	if (ownerEmail) {
		rows.push({
			type: "email_quota_warning",
			idempotencyKey: key("quota-warning"),
			eventId: projectId,
			recipientEmail: ownerEmail,
			subject: "Uso de e-mails perto do limite",
			templateVersion: "seed-v1",
			status: "sent",
			attempts: 1,
			provider: "resend",
			providerMessageId: "seed-msg-quota",
			propsHash: PLACEHOLDER_PROPS_HASH,
			entityRefs: {
				projectId,
				used: 480,
				limit: 500,
				day: dayKey(refDate),
			},
			createdAt: created(60),
			updatedAt: created(55),
			sentAt: created(55),
		});
	}

	return rows;
}

/**
 * Insere as linhas fictícias de forma idempotente (conflito pela chave de
 * idempotência é ignorado). Devolve quantas linhas novas entraram.
 */
export async function insertNotificationFixtures(
	db: SeedDb,
	input: NotificationFixtureInput,
): Promise<number> {
	const rows = buildNotificationFixtures(input);
	if (rows.length === 0) return 0;
	const inserted = await db
		.insert(schema.notification)
		.values(rows)
		.onConflictDoNothing({ target: schema.notification.idempotencyKey })
		.returning({ id: schema.notification.id });
	return inserted.length;
}

/** Carrega os insumos das linhas fictícias de um projeto já existente. */
export async function loadNotificationFixtureInput(
	db: SeedDb,
	project: { id: string; ownerId: string },
	refDate: Date,
): Promise<NotificationFixtureInput> {
	const participants = await db
		.select({ id: schema.participant.id, email: schema.user.email })
		.from(schema.participant)
		.innerJoin(schema.user, eq(schema.user.id, schema.participant.userId))
		.where(eq(schema.participant.projectId, project.id));

	const enrollments = await db
		.select({
			activityId: schema.participantOnActivity.activityId,
			participantId: schema.participantOnActivity.participantId,
			subscribedAt: schema.participantOnActivity.subscribedAt,
		})
		.from(schema.participantOnActivity)
		.innerJoin(
			schema.activity,
			eq(schema.activity.id, schema.participantOnActivity.activityId),
		)
		.where(eq(schema.activity.projectId, project.id));

	const [owner] = await db
		.select({ email: schema.user.email })
		.from(schema.user)
		.where(eq(schema.user.id, project.ownerId));

	return {
		projectId: project.id,
		participants,
		enrollments,
		ownerEmail: owner?.email ?? null,
		refDate,
	};
}
