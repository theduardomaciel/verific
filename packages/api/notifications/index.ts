export type {
	EmailMessage,
	EmailProvider,
	EntityRefs,
	EntityRefValue,
	NotificationCursor,
	NotificationListFilter,
	NotificationStatus,
	NotificationStatusCounts,
	NotificationType,
	PublicNotification,
	SendNotificationInput,
	SendResult,
	SkipReason,
} from "./types";
export {
	NOTIFICATION_LIST_FILTERS,
	NOTIFICATION_TYPE_KEYS,
	NOTIFICATION_TYPE_LABELS,
} from "./types";
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
export { renderTemplate } from "./templates";
export type {
	BuildContext,
	NotificationAudience,
	NotificationCategory,
	NotificationScope,
	NotificationTypeDefinition,
	SharedActivity,
	SharedProject,
	ValidationResult,
} from "./registry";
export {
	createBuildContext,
	DEFERRED_NOTIFICATION_TYPES,
	getNotificationDefinition,
	hashProps,
	InvalidEntityRefsError,
	isNotificationTypeKey,
	loadSharedActivity,
	notificationRegistry,
	stableStringify,
	validateEntityRefs,
} from "./registry";
export type {
	NotificationSettingItem,
	NotificationSettingUpdate,
} from "./settings";
export {
	getEventNotificationSettings,
	getNotificationEnabledMap,
	isNotificationEnabled,
	updateEventNotificationSettings,
} from "./settings";
export type {
	EmailUsage,
	ProcessQueuedResult,
	ReprocessBatchOptions,
	ReprocessBatchResult,
	ReprocessOneOptions,
	SendNotificationResult,
	ServiceDeps,
} from "./service";
export {
	enqueueNotifications,
	getEmailUsage,
	MAX_SEND_ATTEMPTS,
	maybeSendQuotaWarning,
	processNotification,
	processQueuedNotifications,
	QUOTA_WARNING_THRESHOLD,
	reprocessBatchNotifications,
	reprocessOneNotification,
	RETRY_BACKOFF_MS,
	sendNotification,
	toPublicNotification,
} from "./service";
export type { QueueRegistrationEmailArgs } from "./registration-email";
export {
	buildRegistrationEmailInput,
	queueEventRegistrationEmail,
} from "./registration-email";
export { scheduleAfterResponse } from "../lib/after-response";
export { formatActivitySessionsText, formatEventDateText } from "./format";
export {
	dispatchNotifications,
	loadActivityAudience,
	loadEnrolledAudience,
	loadNotificationRecipients,
	notifyActivityCancelled,
	notifyActivityEnrollmentCancelled,
	notifyActivityEnrollmentConfirmed,
	notifyActivityEnrollmentRemoved,
	notifyActivityUpdated,
	notifyActivityWaitlisted,
	notifyActivityWaitlistOffered,
	notifyActivityWaitlistPromoted,
	notifyActivityWaitlistRemoved,
	notifyEventRegistrationRemoved,
	notifyProjectContributorAdded,
	notifyProjectContributorRemoved,
	notifyProjectDeleted,
} from "./triggers";
export {
	activityUrl,
	adminEmailsUrl,
	emailUrl,
	eventScheduleUrl,
	eventUrl,
	profileUrl,
} from "./urls";
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
export {
	PROJECT_CONTRIBUTOR_ADDED_VERSION,
	ProjectContributorAddedEmail,
	projectContributorAddedPreviewProps,
	projectContributorAddedSubject,
	renderProjectContributorAdded,
} from "./emails/project-contributor-added";
export type { ProjectContributorAddedProps } from "./emails/project-contributor-added";
export {
	PROJECT_CONTRIBUTOR_REMOVED_VERSION,
	ProjectContributorRemovedEmail,
	projectContributorRemovedPreviewProps,
	projectContributorRemovedSubject,
	renderProjectContributorRemoved,
} from "./emails/project-contributor-removed";
export type { ProjectContributorRemovedProps } from "./emails/project-contributor-removed";
export {
	PROJECT_DELETED_VERSION,
	ProjectDeletedEmail,
	projectDeletedPreviewProps,
	projectDeletedSubject,
	renderProjectDeleted,
} from "./emails/project-deleted";
export type { ProjectDeletedProps } from "./emails/project-deleted";
export {
	sanitizeVerificLogoUrl,
	VerificEmailCta,
	VerificTransactionalLayout,
	verificEmailStyles,
	verificPalette,
} from "./emails/verific-transactional-layout";
export { getProvider } from "./providers";
export { createConsoleProvider } from "./providers/console";
export type { ConsoleProviderOptions } from "./providers/console";
export { classifySesError, createSesProvider } from "./providers/ses";
export type { SesProviderOptions } from "./providers/ses";
export { classifyResendError, createResendProvider } from "./providers/resend";
export type { ResendProviderOptions } from "./providers/resend";
