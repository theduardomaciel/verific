import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { instant } from "./columns";
import { project } from "./project";

export const NOTIFICATION_STATUSES = [
	"pending",
	"sending",
	"sent",
	"failed",
	"blocked_quota",
	"skipped",
] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/**
 * Central notification outbox. One row per notification to send.
 *
 * `entityRefs` holds the ids (and small scalars) the registry needs to
 * validate and rebuild the template props on every attempt. It is the only
 * send input; rendered HTML is never stored. `type` stays free-form text
 * (no pgEnum) so new notification types can be added without a migration.
 */
export const notification = pgTable(
	"notifications",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		type: text("type").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		eventId: uuid("event_id").references(() => project.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
		recipientEmail: text("recipient_email").notNull(),
		subject: text("subject"),
		templateVersion: text("template_version"),
		status: text("status")
			.notNull()
			.default("pending")
			.$type<NotificationStatus>(),
		attempts: integer("attempts").notNull().default(0),
		lastError: text("last_error"),
		lastErrorRetryable: boolean("last_error_retryable"),
		provider: text("provider"),
		providerMessageId: text("provider_message_id"),
		/** Ids + small scalars needed by validate/buildProps. Source of truth. */
		entityRefs: jsonb("entity_refs")
			.$type<Record<string, string | number | boolean | null>>()
			.notNull()
			.default({}),
		/** sha256 of the props used in the last attempt (audit only). */
		propsHash: text("props_hash"),
		/** Why a row was skipped instead of sent (see notification SkipReason). */
		skipReason: text("skip_reason"),
		createdAt: instant("created_at").defaultNow().notNull(),
		updatedAt: instant("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		sentAt: instant("sent_at"),
	},
	(table) => [
		uniqueIndex().on(table.idempotencyKey),
		index("notifications_status_created_at_idx").on(
			table.status,
			table.createdAt,
		),
		index("notifications_event_id_status_idx").on(
			table.eventId,
			table.status,
		),
		// Uso das últimas 24 h (limite diário de e-mails)
		index("notifications_status_sent_at_idx").on(
			table.status,
			table.sentAt,
		),
	],
);

/**
 * Per-event overrides of the registry `defaultEnabled` value. A missing row
 * means "use the registry default"; a row always stores the explicit value
 * the organizer chose. Keyed by (projectId, type).
 */
export const projectNotificationSetting = pgTable(
	"project_notification_settings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		type: text("type").notNull(),
		enabled: boolean("enabled").notNull(),
		createdAt: instant("created_at").defaultNow().notNull(),
		updatedAt: instant("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex("project_notification_settings_project_type_unique").on(
			table.projectId,
			table.type,
		),
	],
);

export const projectNotificationSettingRelations = relations(
	projectNotificationSetting,
	({ one }) => ({
		project: one(project, {
			fields: [projectNotificationSetting.projectId],
			references: [project.id],
		}),
	}),
);

export const notificationRelations = relations(notification, ({ one }) => ({
	event: one(project, {
		fields: [notification.eventId],
		references: [project.id],
	}),
}));
