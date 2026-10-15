import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { project } from "./project";

export const NOTIFICATION_STATUSES = [
	"pending",
	"sending",
	"sent",
	"failed",
	"blocked_quota",
] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/**
 * Central notification outbox. One row per notification to send.
 *
 * `payload` holds the template props so a failed notification can be
 * re-rendered and reprocessed later. Rendered HTML is never stored.
 * `type` stays free-form text (no pgEnum) so new notification types can be
 * added without a migration.
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
		payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		sentAt: timestamp("sent_at"),
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
	],
);

export const notificationRelations = relations(notification, ({ one }) => ({
	event: one(project, {
		fields: [notification.eventId],
		references: [project.id],
	}),
}));
