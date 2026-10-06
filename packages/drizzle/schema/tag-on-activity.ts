import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { activity } from "./activity";
import { tag } from "./tag";

export const tagOnActivity = pgTable(
	"tag_activities",
	{
		activityId: uuid("activity_id")
			.notNull()
			.references(() => activity.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		tagId: uuid("tag_id")
			.notNull()
			.references(() => tag.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.activityId, table.tagId] }),
	}),
);

export const tagOnActivityRelations = relations(tagOnActivity, ({ one }) => ({
	activity: one(activity, {
		fields: [tagOnActivity.activityId],
		references: [activity.id],
	}),
	tag: one(tag, {
		fields: [tagOnActivity.tagId],
		references: [tag.id],
	}),
}));
