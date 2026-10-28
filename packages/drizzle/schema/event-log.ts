import { relations } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { activity } from "./activity";
import { participant } from "./participant";
import { project } from "./project";
import { user } from "./user";

/**
 * Tipos de ação registrados no log do evento. Mantido como união TypeScript
 * (coluna `text`) para que novos tipos não exijam migração.
 */
export const EVENT_LOG_TYPES = [
	"activity.created",
	"activity.updated",
	"activity.cancelled",
	"activity.monitor_added",
	"enrollment.created",
	"enrollment.overbooked",
	"enrollment.cancelled",
	"enrollment.removed",
	"enrollment.no_show_released",
	"waitlist.joined",
	"waitlist.left",
	"waitlist.offered",
	"waitlist.confirmed",
	"waitlist.promoted",
	"waitlist.expired",
	"waitlist.removed",
	"waitlist.revoked",
	"session.checkin",
	"session.checkout",
	"reception.checkin",
	"participant.joined_event",
	"participant.removed_event",
] as const;

export type EventLogType = (typeof EVENT_LOG_TYPES)[number];

/**
 * Log operacional append-only do evento. Cada ação é gravada na mesma
 * transação que a executa; `participantName`/`activityName`/`actorName` são
 * snapshots para a leitura não precisar de joins.
 */
export const eventLog = pgTable(
	"event_logs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		activityId: uuid("activity_id").references(() => activity.id, {
			onDelete: "set null",
			onUpdate: "cascade",
		}),
		participantId: uuid("participant_id").references(() => participant.id, {
			onDelete: "set null",
			onUpdate: "cascade",
		}),
		actorUserId: uuid("actor_user_id").references(() => user.id, {
			onDelete: "set null",
			onUpdate: "cascade",
		}),
		type: text("type").$type<EventLogType>().notNull(),
		activityName: text("activity_name"),
		participantName: text("participant_name"),
		actorName: text("actor_name"),
		metadata: jsonb("metadata")
			.$type<Record<string, unknown>>()
			.notNull()
			.default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("event_logs_project_created_idx").on(
			table.projectId,
			table.createdAt,
		),
		index("event_logs_project_type_idx").on(table.projectId, table.type),
		index("event_logs_activity_created_idx").on(
			table.activityId,
			table.createdAt,
		),
	],
);

export const eventLogRelations = relations(eventLog, ({ one }) => ({
	project: one(project, {
		fields: [eventLog.projectId],
		references: [project.id],
	}),
	activity: one(activity, {
		fields: [eventLog.activityId],
		references: [activity.id],
	}),
	participant: one(participant, {
		fields: [eventLog.participantId],
		references: [participant.id],
	}),
	actor: one(user, {
		fields: [eventLog.actorUserId],
		references: [user.id],
	}),
}));
