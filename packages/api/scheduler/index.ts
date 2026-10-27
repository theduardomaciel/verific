import "server-only";
import { env } from "@verific/env";

export interface ScheduleOfferExpiryArgs {
	/** The waitlist entry id (enrollment id). */
	enrollmentId: string;
	/** Activity id for context/logging. */
	activityId: string;
	/** When the offer was created (iso string). Used for dedup id. */
	offeredAt: string;
	/** When the offer expires (iso string, UTC). Absolute delivery time. */
	expiresAt: string;
}

export interface ScheduleOfferExpiryResult {
	/** Provider-specific message id for debugging. */
	messageId?: string;
}

/**
 * Scheduler for waitlist offer expiry notifications.
 * Implementations: qstash (production), console (dev/test).
 */
export interface OfferExpiryScheduler {
	/** Schedule a one-off delayed call to the offer-expiry endpoint. */
	schedule(args: ScheduleOfferExpiryArgs): Promise<ScheduleOfferExpiryResult>;
}

/** Deduplication id format: offer-expiry:{enrollmentId}:{offeredAt} */
export function buildDeduplicationId(
	enrollmentId: string,
	offeredAt: string,
): string {
	return `offer-expiry:${enrollmentId}:${offeredAt}`;
}

export interface ScheduleNotificationRetryArgs {
	notificationId: string;
	/** Rodada de envio que esta entrega vai executar (2 = primeiro reenvio). */
	round: number;
	/** Quando a rodada pode rodar (UTC). */
	notBefore: Date;
}

/**
 * Reenvio de notificações que falharam por erro temporário (limite de
 * taxa do provedor, 5xx). Implementações: qstash (produção), console.
 */
export interface NotificationRetryScheduler {
	scheduleRetry(
		args: ScheduleNotificationRetryArgs,
	): Promise<ScheduleOfferExpiryResult>;
}

function schedulerProvider() {
	return env.SCHEDULER_PROVIDER ?? (env.QSTASH_TOKEN ? "qstash" : "console");
}

/**
 * Resolves the active scheduler based on env.
 * Defaults to console when QSTASH_TOKEN is not set.
 */
export async function getOfferExpiryScheduler(): Promise<OfferExpiryScheduler> {
	switch (schedulerProvider()) {
		case "qstash": {
			const { createQStashScheduler } = await import("./qstash");
			return createQStashScheduler();
		}
		case "console":
		default: {
			const { createConsoleScheduler } = await import("./console");
			return createConsoleScheduler();
		}
	}
}

export async function getNotificationRetryScheduler(): Promise<NotificationRetryScheduler> {
	switch (schedulerProvider()) {
		case "qstash": {
			const { createQStashNotificationRetryScheduler } =
				await import("./qstash");
			return createQStashNotificationRetryScheduler();
		}
		case "console":
		default: {
			const { createConsoleNotificationRetryScheduler } =
				await import("./console");
			return createConsoleNotificationRetryScheduler();
		}
	}
}
