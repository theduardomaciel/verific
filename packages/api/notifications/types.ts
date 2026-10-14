export type SendResult =
	| { ok: true; providerMessageId: string }
	| { ok: false; retryable: boolean; code: string; message: string };

export interface EmailMessage {
	to: string;
	from: string;
	subject: string;
	html: string;
	text: string;
	headers?: Record<string, string>;
	idempotencyKey?: string;
}

/**
 * Email delivery adapter. `send` must never throw: every failure, including
 * unexpected SDK/network exceptions, is returned as a `SendResult` with
 * `ok: false` so the service can record it on the notification row.
 */
export interface EmailProvider {
	name: string;
	send(msg: EmailMessage): Promise<SendResult>;
}

/** Notification types supported by the template registry. */
export type NotificationType = "event_registration_confirmation";

export type NotificationStatus =
	| "pending"
	| "sending"
	| "sent"
	| "failed"
	| "blocked_quota";

export interface SendNotificationInput {
	type: NotificationType;
	/** Unique per notification. Replays return the existing row unsent. */
	idempotencyKey: string;
	to: string;
	/** Project ("event") id. Nullable by design. */
	eventId?: string | null;
	/** Template props, stored as-is so failures can be re-rendered. */
	payload: Record<string, unknown>;
}
