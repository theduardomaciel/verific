import { relations, sql } from "drizzle-orm";
import {
	index,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { waitlistEventTypeEnum, waitlistStatusEnum } from "../enum/waitlist";
import { activity } from "./activity";
import { participant } from "./participant";
import { user } from "./user";

export const activityWaitlist = pgTable(
	"activity_waitlist",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		activityId: uuid("activity_id")
			.notNull()
			.references(() => activity.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		participantId: uuid("participant_id")
			.notNull()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		status: waitlistStatusEnum("status").notNull().default("waiting"),
		joinedAt: timestamp("joined_at").defaultNow().notNull(),
		offeredAt: timestamp("offered_at"),
		offerExpiresAt: timestamp("offer_expires_at"),
		resolvedAt: timestamp("resolved_at"),
	},
	(table) => [
		// Uma entrada ativa por pessoa; quem saiu pode voltar
		uniqueIndex("activity_waitlist_active_entry")
			.on(table.activityId, table.participantId)
			.where(sql`${table.status} in ('waiting', 'offered')`),
		index("activity_waitlist_queue").on(
			table.activityId,
			table.status,
			table.joinedAt,
		),
	],
);

export const activityWaitlistEvent = pgTable(
	"activity_waitlist_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		activityId: uuid("activity_id")
			.notNull()
			.references(() => activity.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		participantId: uuid("participant_id")
			.notNull()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		type: waitlistEventTypeEnum("type").notNull(),
		// Nulo quando a mudança foi automática
		actorUserId: uuid("actor_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index().on(table.activityId, table.createdAt)],
);

export const activityWaitlistRelations = relations(
	activityWaitlist,
	({ one }) => ({
		activity: one(activity, {
			fields: [activityWaitlist.activityId],
			references: [activity.id],
		}),
		participant: one(participant, {
			fields: [activityWaitlist.participantId],
			references: [participant.id],
		}),
	}),
);

export const activityWaitlistEventRelations = relations(
	activityWaitlistEvent,
	({ one }) => ({
		activity: one(activity, {
			fields: [activityWaitlistEvent.activityId],
			references: [activity.id],
		}),
		participant: one(participant, {
			fields: [activityWaitlistEvent.participantId],
			references: [participant.id],
		}),
		actor: one(user, {
			fields: [activityWaitlistEvent.actorUserId],
			references: [user.id],
		}),
	}),
);
