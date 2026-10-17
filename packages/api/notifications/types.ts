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

/**
 * Notification types supported by the registry. Adding a key here without a
 * registry entry fails typecheck (see `notifications/registry.ts`).
 */
export const NOTIFICATION_TYPE_KEYS = [
	"event_registration_confirmation",
	"event_registration_removed",
	"activity_enrollment_confirmed",
	"activity_waitlisted",
	"activity_waitlist_offered",
	"activity_waitlist_promoted",
	"activity_enrollment_cancelled",
	"activity_enrollment_removed",
	"activity_updated",
	"activity_cancelled",
	"email_quota_warning",
	"project_contributor_added",
	"project_deleted",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPE_KEYS)[number];

/**
 * Value stored in `notifications.entity_refs`. Ids and small scalars only —
 * never template props. `buildProps` turns these back into DB state.
 */
export type EntityRefValue = string | number | boolean | null;
export type EntityRefs = Record<string, EntityRefValue>;

export type NotificationStatus =
	| "pending"
	| "sending"
	| "sent"
	| "failed"
	| "blocked_quota"
	| "skipped";

/**
 * Why a notification was recorded as `skipped` instead of sent. The admin
 * log shows these verbatim so an organizer understands why no e-mail went out.
 */
export type SkipReason =
	| "disabled_by_event"
	| "entity_gone"
	| "state_changed"
	| "unsupported_type";

export interface SendNotificationInput {
	/** Registry type when known; arbitrary strings go through `unsupported_type`. */
	type: NotificationType | (string & {});
	/** Unique per notification. Replays return the existing row unsent. */
	idempotencyKey: string;
	to: string;
	/** Project ("event") id. Nullable by design. */
	eventId?: string | null;
	/**
	 * Ids (and small scalars) needed by `validate`/`buildProps`. This is the
	 * only stored input for a send; template props are always rebuilt.
	 */
	entityRefs: EntityRefs;
}

/** Human-readable pt-BR label per type. Adding a NotificationType without a label here fails typecheck. */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
	event_registration_confirmation: "Confirmação de inscrição",
	event_registration_removed: "Removido do evento",
	activity_enrollment_confirmed: "Inscrição em atividade",
	activity_waitlisted: "Entrou na fila de espera",
	activity_waitlist_offered: "Vaga oferecida na fila",
	activity_waitlist_promoted: "Vaga conquistada na fila",
	activity_enrollment_cancelled: "Inscrição cancelada",
	activity_enrollment_removed: "Removido de atividade",
	activity_updated: "Atividade atualizada",
	activity_cancelled: "Atividade cancelada",
	email_quota_warning: "Alerta de cota de e-mails",
	project_contributor_added: "Adicionado como contribuidor",
	project_deleted: "Projeto excluído",
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
	"skipped",
] as const;

export type NotificationListFilter = (typeof NOTIFICATION_LIST_FILTERS)[number];

/** Keyset cursor on (createdAt, id). createdAt travels as an ISO string. */
export interface NotificationCursor {
	createdAt: string;
	id: string;
}

/**
 * Admin-facing row. Never contains `payload`/`entityRefs` (template input
 * stays server-side). `stuck` is derived server-side: status `sending` with
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
	/** Why the row was skipped (disabled_by_event, entity_gone, ...). */
	skipReason: string | null;
	/** sha256 of the props used in the last attempt. Audit only. */
	propsHash: string | null;
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
	skipped: number;
}
