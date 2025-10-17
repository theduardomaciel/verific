import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { activity } from "./activity";
import { relations } from "drizzle-orm";

export const activityExclusion = pgTable(
	"activity_exclusions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		activityId: uuid("activity_id")
			.notNull()
			.references(() => activity.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		excludedActivityId: uuid("excluded_activity_id")
			.notNull()
			.references(() => activity.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		uniqueExclusion: uniqueIndex("unique_activity_exclusion").on(
			table.activityId,
			table.excludedActivityId,
		),
	}),
);

export const activityExclusionRelations = relations(
	activityExclusion,
	({ one }) => ({
		activity: one(activity, {
			fields: [activityExclusion.activityId],
			references: [activity.id],
			relationName: "activityExclusions",
		}),
		excludedActivity: one(activity, {
			fields: [activityExclusion.excludedActivityId],
			references: [activity.id],
			relationName: "excludingActivities",
		}),
	}),
);
