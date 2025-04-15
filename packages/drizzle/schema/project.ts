import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { activity, participant, speaker } from ".";
import { boolean } from "drizzle-orm/pg-core";

export const project = pgTable("projects", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	url: text("url").notNull(),
	address: text("address").notNull(),
	hasRegistration: boolean("has_registration").default(false).notNull(),
	hasResearch: boolean("has_research").default(false).notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
	coverUrl: text("cover_url").notNull(),
	thumbnailUrl: text("thumbnail_url").notNull(),
	primaryColor: text("primary_color").notNull(),
	secondaryColor: text("secondary_color").notNull(),
	startDate: timestamp("start_date").notNull(),
	endDate: timestamp("end_date").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectRelations = relations(project, ({ many }) => ({
	activities: many(activity),
	participants: many(participant),
	speakers: many(speaker),
}));
