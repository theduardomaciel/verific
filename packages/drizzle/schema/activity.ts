import { relations } from "drizzle-orm";
import {
	doublePrecision,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { participantOnActivity, project } from ".";

import { categoryEnum } from "../enum/category";
import { audienceEnum } from "../enum/audience";
import { speakersOnActivity } from "./speaker-on-activity";
import { activityExclusion } from "./activity-exclusion";

export const activity = pgTable("activities", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	description: text("description"),
	banner_url: text("banner_url"),

	dateFrom: timestamp("date_from").notNull(),
	dateTo: timestamp("date_to").notNull(),

	audience: audienceEnum("audience").notNull().default("internal"),
	category: categoryEnum("category").notNull().default("other"),

	participantsLimit: integer("participants_limit"),
	tolerance: integer("tolerance"),
	workload: integer("workload"),

	// 📍 Location fields
	address: text("address"), // Human-readable address for display
	latitude: doublePrecision("latitude"),
	longitude: doublePrecision("longitude"),

	projectId: uuid("project_id")
		.notNull()
		.references(() => project.id, {
			onDelete: "restrict",
			onUpdate: "cascade",
		}),

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityRelations = relations(activity, ({ one, many }) => ({
	project: one(project, {
		fields: [activity.projectId],
		references: [project.id],
	}),
	participantsOnActivity: many(participantOnActivity),
	speakersOnActivity: many(speakersOnActivity),
	excludedActivities: many(activityExclusion, {
		relationName: "activityExclusions",
	}),
	excludingActivities: many(activityExclusion, {
		relationName: "excludingActivities",
	}),
}));
