import { relations } from "drizzle-orm";
import {
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { participant, activity } from ".";

export const participantRoles = ["participant", "moderator"] as const;
export const roleEnum = pgEnum("role", participantRoles);
export type Role = (typeof participantRoles)[number];

export const participantOnActivity = pgTable(
	"participant_activities",
	{
		participantId: uuid("participant_id")
			.notNull()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		activityId: uuid("activity_id")
			.notNull()
			.references(() => activity.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		role: roleEnum("role").notNull().default("participant"),
		joinedAt: timestamp("joined_at").notNull().defaultNow(),
		leftAt: timestamp("left_at"),
	},
	(table) => [
		uniqueIndex().on(table.participantId, table.activityId, table.role),
	],
);

export const participantOnActivityRelations = relations(
	participantOnActivity,
	({ one }) => ({
		participant: one(participant, {
			fields: [participantOnActivity.participantId],
			references: [participant.id],
		}),
		activity: one(activity, {
			fields: [participantOnActivity.activityId],
			references: [activity.id],
		}),
	}),
);
