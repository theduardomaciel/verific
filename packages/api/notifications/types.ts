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

/** Human-readable pt-BR label per type. Adding a NotificationType without a label here fails typecheck. */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
	event_registration_confirmation: "Confirmação de inscrição",
};

export const NOTIFICATION_LIST_FILTERS = [
	"attention",
	"all",
	"pending",
	"sending",
	"stuck",
	"sent",
	"failed",
	"blocked_quota",
] as const;

export type NotificationListFilter = (typeof NOTIFICATION_LIST_FILTERS)[number];

/** Keyset cursor on (createdAt, id). createdAt travels as an ISO string. */
export interface NotificationCursor {
	createdAt: string;
	id: string;
}

/**
 * Admin-facing row. Never contains `payload` (template props stay
 * server-side). `stuck` is derived server-side: status `sending` with
 * `updatedAt` older than STALE_CLAIM_TIMEOUT_MS.
 */
export interface PublicNotification {
	id: string;
	type: string;
	idempotencyKey: string;
	eventId: string | null;
	recipientEmail: string;
	subject: string | null;
	templateVersion: string | null;
	status: NotificationStatus;
	stuck: boolean;
	attempts: number;
	lastError: string | null;
	lastErrorRetryable: boolean | null;
	provider: string | null;
	providerMessageId: string | null;
	createdAt: Date;
	updatedAt: Date;
	sentAt: Date | null;
}

export interface NotificationStatusCounts {
	pending: number;
	/** Fresh `sending` only; stale ones are reported as `stuck`. */
	sending: number;
	stuck: number;
	sent: number;
	failed: number;
	blocked_quota: number;
}
