import { relations } from "drizzle-orm";
import {
	boolean,
	doublePrecision,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { audienceEnum } from "../enum/audience";
import { categoryEnum } from "../enum/category";
import { activityConflict } from "./activity-conflict";
import { activitySession } from "./activity-session";
import { activityWaitlist } from "./activity-waitlist";
import { participantOnActivity } from "./participant-on-activity";
import { project } from "./project";
import { speakerOnActivity } from "./speaker-on-activity";
import { tagOnActivity } from "./tag-on-activity";

export const activity = pgTable("activities", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	description: text("description"),
	bannerUrl: text("banner_url"),
	isPublished: boolean("is_published").notNull().default(true), // Controls if the activity is visible/discoverable to users
	isRegistrationOpen: boolean("is_registration_open").notNull().default(true), // Controls if users can sign up

	audience: audienceEnum("audience").notNull().default("internal"),
	category: categoryEnum("category").notNull().default("other"),

	participantsLimit: integer("participants_limit"),
	tolerance: integer("tolerance"),
	workload: integer("workload"),
	allowOverlap: boolean("allow_overlap").notNull().default(false),
	// Prazo para confirmar a vaga oferecida pela fila de espera
	waitlistOfferHours: integer("waitlist_offer_hours").notNull().default(12),

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
	participantOnActivity: many(participantOnActivity),
	speakerOnActivity: many(speakerOnActivity),
	sessions: many(activitySession),
	tagOnActivity: many(tagOnActivity),
	waitlist: many(activityWaitlist),
	conflictsAsBlocking: many(activityConflict, {
		relationName: "blockingActivities",
	}),
	conflictsAsBlocked: many(activityConflict, {
		relationName: "blockedActivities",
	}),
}));
