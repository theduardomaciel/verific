import { uuid, smallserial, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { activity } from "./activity";
import { speaker } from "./speaker";
import { relations } from "drizzle-orm";

export const speakerOnActivity = pgTable(
	"speaker_activities",
	{
		activityId: uuid("activity_id")
			.notNull()
			.references(() => activity.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		speakerId: smallserial("speaker_id")
			.notNull()
			.references(() => speaker.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.activityId, table.speakerId] }),
	}),
);

export const speakerOnActivityRelations = relations(
	speakerOnActivity,
	({ one }) => ({
		activity: one(activity, {
			fields: [speakerOnActivity.activityId],
			references: [activity.id],
		}),
		speaker: one(speaker, {
			fields: [speakerOnActivity.speakerId],
			references: [speaker.id],
		}),
	}),
);
