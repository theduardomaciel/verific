import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { activity } from "./activity";
import { sessionAttendance } from "./session-attendance";

export const activitySession = pgTable("activity_sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	activityId: uuid("activity_id")
		.notNull()
		.references(() => activity.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
	startsAt: timestamp("starts_at").notNull(),
	endsAt: timestamp("ends_at").notNull(),
	address: text("address"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activitySessionRelations = relations(
	activitySession,
	({ one, many }) => ({
		activity: one(activity, {
			fields: [activitySession.activityId],
			references: [activity.id],
		}),
		attendances: many(sessionAttendance),
	}),
);
