import { uuid, smallserial, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { activity } from "./activity";
import { speaker } from "./speaker";
import { relations } from "drizzle-orm";

export const speakersOnActivity = pgTable(
	"speakers_on_activities",
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

export const speakersOnActivityRelations = relations(
	speakersOnActivity,
	({ one }) => ({
		activity: one(activity, {
			fields: [speakersOnActivity.activityId],
			references: [activity.id],
		}),
		speaker: one(speaker, {
			fields: [speakersOnActivity.speakerId],
			references: [speaker.id],
		}),
	}),
);
