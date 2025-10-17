import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { activity } from "./activity";
import { relations } from "drizzle-orm";

export const activityConflict = pgTable(
	"activity_conflicts",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		blockingActivityId: uuid("blocking_activity_id")
			.notNull()
			.references(() => activity.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),

		blockedActivityId: uuid("blocked_activity_id")
			.notNull()
			.references(() => activity.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("unique_activity_conflict").on(
			table.blockingActivityId,
			table.blockedActivityId,
		),
	],
);

export const activityConflictRelations = relations(activityConflict, ({ one }) => ({
	blockingActivity: one(activity, {
		fields: [activityConflict.blockingActivityId],
		references: [activity.id],
		relationName: "blockedActivities",
	}),
	blockedActivity: one(activity, {
		fields: [activityConflict.blockedActivityId],
		references: [activity.id],
		relationName: "blockingActivities",
	}),
}));
