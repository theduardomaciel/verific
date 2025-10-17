import { relations } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	uuid,
	doublePrecision,
	boolean,
} from "drizzle-orm/pg-core";

import { activity, participant, speaker, user } from ".";
import { projectModerator } from "./project-moderator";

export const project = pgTable("projects", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	description: text("description"),
	welcomeMessage: text("welcome_message"),

	url: text("url").notNull(),
	researchUrl: text("research_url"),

	// 📍 Location fields
	address: text("address").notNull(), // Human-readable address for display
	latitude: doublePrecision("latitude"),
	longitude: doublePrecision("longitude"),

	isRegistrationEnabled: boolean("is_registration_enabled").default(false),
	isResearchEnabled: boolean("is_research_enabled").default(false),
	isArchived: boolean("is_archived").default(false),

	logoUrl: text("logo_url"),
	largeLogoUrl: text("large_logo_url"),
	coverUrl: text("cover_url"),
	thumbnailUrl: text("thumbnail_url"),

	primaryColor: text("primary_color").default("#3B82F6"),
	secondaryColor: text("secondary_color").default("#60A8FB"),

	startDate: timestamp("start_date").notNull(),
	endDate: timestamp("end_date").notNull(),

	ownerId: uuid("owner_id")
		.notNull()
		.references(() => user.id, {
			onDelete: "restrict",
			onUpdate: "cascade",
		}),

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectRelations = relations(project, ({ many, one }) => ({
	activities: many(activity),
	participants: many(participant),
	speakers: many(speaker),
	moderators: many(projectModerator),
	owner: one(user, {
		fields: [project.ownerId],
		references: [user.id],
	}),
}));