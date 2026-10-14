export type {
	EmailMessage,
	EmailProvider,
	NotificationStatus,
	NotificationType,
	SendNotificationInput,
	SendResult,
} from "./types";
export type { EmailConfig, EmailProviderName } from "./config";
export { loadEmailConfig, resolveEmailConfig } from "./config";
export type {
	NotificationPatch,
	NotificationRow,
	NotificationStore,
} from "./store";
export { DrizzleNotificationStore } from "./store";
export type { RenderedTemplate, TemplateDefinition } from "./templates";
export { renderTemplate, templateRegistry } from "./templates";
export type { SendNotificationResult, ServiceDeps } from "./service";
export {
	MAX_SEND_ATTEMPTS,
	processNotification,
	RETRY_BACKOFF_MS,
	sendNotification,
} from "./service";
export { getProvider } from "./providers";
export { createConsoleProvider } from "./providers/console";
export type { ConsoleProviderOptions } from "./providers/console";
export { classifySesError, createSesProvider } from "./providers/ses";
export type { SesProviderOptions } from "./providers/ses";
export { classifyResendError, createResendProvider } from "./providers/resend";
export type { ResendProviderOptions } from "./providers/resend";
