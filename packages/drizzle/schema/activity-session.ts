import { relations } from "drizzle-orm";
import { pgTable, text, uuid, index } from "drizzle-orm/pg-core";

import { activity } from "./activity";
import { instant } from "./columns";
import { sessionAttendance } from "./session-attendance";

export const activitySession = pgTable(
	"activity_sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		activityId: uuid("activity_id")
			.notNull()
			.references(() => activity.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		startsAt: instant("starts_at").notNull(),
		endsAt: instant("ends_at").notNull(),
		address: text("address"),
		createdAt: instant("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("activity_sessions_activity_id_idx").on(table.activityId),
	],
);

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
