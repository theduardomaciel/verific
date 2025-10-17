import { relations } from "drizzle-orm";
import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { participant, activity } from ".";

// Enums
import { roleEnum } from "../enum/role";

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
		subscribedAt: timestamp("subscribedAt").notNull().defaultNow(),
		joinedAt: timestamp("joined_at"),
		leftAt: timestamp("left_at"),
	},
	(table) => [uniqueIndex().on(table.participantId, table.activityId)],
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
