export type {
	EmailMessage,
	EmailProvider,
	NotificationCursor,
	NotificationListFilter,
	NotificationStatus,
	NotificationStatusCounts,
	NotificationType,
	PublicNotification,
	SendNotificationInput,
	SendResult,
} from "./types";
export { NOTIFICATION_LIST_FILTERS, NOTIFICATION_TYPE_LABELS } from "./types";
export type { EmailConfig, EmailProviderName } from "./config";
export { loadEmailConfig, resolveEmailConfig } from "./config";
export type {
	NotificationPatch,
	NotificationRow,
	NotificationStore,
} from "./store";
export { DrizzleNotificationStore, STALE_CLAIM_TIMEOUT_MS } from "./store";
export type { ListNotificationsOptions } from "./store";
export type { RenderedTemplate, TemplateDefinition } from "./templates";
export { renderTemplate, templateRegistry } from "./templates";
export type {
	EmailUsage,
	ReprocessBatchOptions,
	ReprocessBatchResult,
	ReprocessOneOptions,
	SendNotificationResult,
	ServiceDeps,
} from "./service";
export {
	getEmailUsage,
	MAX_SEND_ATTEMPTS,
	processNotification,
	reprocessBatchNotifications,
	reprocessOneNotification,
	RETRY_BACKOFF_MS,
	sendNotification,
	toPublicNotification,
} from "./service";
export type { QueueRegistrationEmailArgs } from "./registration-email";
export {
	buildRegistrationEmailInput,
	formatEventDateText,
	queueEventRegistrationEmail,
	scheduleAfterResponse,
} from "./registration-email";
export {
	EVENT_REGISTRATION_CONFIRMATION_VERSION,
	EventRegistrationConfirmationEmail,
	eventRegistrationConfirmationPreviewProps,
	renderEventRegistrationConfirmation,
	sanitizeLogoUrl,
} from "./emails/event-registration-confirmation";
export type {
	EventRegistrationConfirmationPayload,
	EventRegistrationConfirmationProps,
} from "./emails/event-registration-confirmation";
export { getProvider } from "./providers";
export { createConsoleProvider } from "./providers/console";
export type { ConsoleProviderOptions } from "./providers/console";
export { classifySesError, createSesProvider } from "./providers/ses";
export type { SesProviderOptions } from "./providers/ses";
export { classifyResendError, createResendProvider } from "./providers/resend";
export type { ResendProviderOptions } from "./providers/resend";
